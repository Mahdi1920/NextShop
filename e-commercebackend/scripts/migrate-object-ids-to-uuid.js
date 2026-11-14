require('dotenv').config();

const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const COLLECTIONS = ['users', 'categories', 'products', 'orders', 'notifications'];
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPLY = process.argv.includes('--apply');

function idKey(value) {
  if (value && typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function makeIdMap(documents) {
  const ids = new Map();
  for (const document of documents) {
    if (document._id == null) throw new Error('Found a document without an _id');
    const oldId = idKey(document._id);
    ids.set(oldId, UUID_V4.test(oldId) ? oldId : randomUUID());
  }
  return ids;
}

function remapId(ids, value) {
  if (value == null) return value;
  const oldId = idKey(value);
  let newId = ids.get(oldId);
  if (!newId) {
    newId = UUID_V4.test(oldId) ? oldId : randomUUID();
    ids.set(oldId, newId);
  }
  return newId;
}

function remapNotificationData(value, maps, fieldName = '') {
  const references = {
    userId: 'users',
    customerId: 'users',
    sellerId: 'users',
    recipientId: 'users',
    productId: 'products',
    originalProductId: 'products',
    replacementProductId: 'products',
    categoryId: 'categories',
    replacementCategoryId: 'categories',
    orderId: 'orders',
  };
  const pluralReferences = {
    userIds: 'users',
    productIds: 'products',
    categoryIds: 'categories',
    orderIds: 'orders',
  };

  if (value == null) return value;
  if (pluralReferences[fieldName] && Array.isArray(value)) {
    return value.map((entry) => remapId(maps.get(pluralReferences[fieldName]), entry));
  }
  if (references[fieldName]) return remapId(maps.get(references[fieldName]), value);
  if (Array.isArray(value)) return value.map((entry) => remapNotificationData(entry, maps));
  if (typeof value === 'object' && !(value instanceof Date) && typeof value.toHexString !== 'function') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, remapNotificationData(entry, maps, key)]));
  }
  return value;
}

function remapDocuments(documentsByCollection, maps) {
  const output = new Map();

  for (const [collectionName, documents] of documentsByCollection) {
    const ids = maps.get(collectionName);
    const remapped = documents.map((source) => {
      const document = { ...source, _id: remapId(ids, source._id) };

      if (collectionName === 'users') {
        document.wishlist = (document.wishlist ?? []).map((id) => remapId(maps.get('products'), id));
        document.orders = (document.orders ?? []).map((id) => remapId(maps.get('orders'), id));
      } else if (collectionName === 'categories') {
        document.parentId = remapId(maps.get('categories'), document.parentId);
      } else if (collectionName === 'products') {
        document.sellerId = remapId(maps.get('users'), document.sellerId);
        document.categoryId = remapId(maps.get('categories'), document.categoryId);
      } else if (collectionName === 'orders') {
        document.customerId = remapId(maps.get('users'), document.customerId);
        document.items = (document.items ?? []).map((item) => ({
          ...item,
          productId: remapId(maps.get('products'), item.productId),
          sellerId: remapId(maps.get('users'), item.sellerId),
          categoryId: remapId(maps.get('categories'), item.categoryId),
        }));
        if (document.exchangeRequest) {
          document.exchangeRequest = {
            ...document.exchangeRequest,
            items: (document.exchangeRequest.items ?? []).map((item) => ({
              ...item,
              originalProductId: remapId(maps.get('products'), item.originalProductId),
              replacementProductId: remapId(maps.get('products'), item.replacementProductId),
              replacementCategoryId: remapId(maps.get('categories'), item.replacementCategoryId),
            })),
            history: (document.exchangeRequest.history ?? []).map((entry) => ({
              ...entry,
              changedBy: remapId(maps.get('users'), entry.changedBy),
            })),
          };
        }
      } else if (collectionName === 'notifications') {
        document.recipientId = remapId(maps.get('users'), document.recipientId);
        document.data = remapNotificationData(document.data ?? {}, maps);
      }

      return document;
    });
    output.set(collectionName, remapped);
  }

  return output;
}

function indexOptions(index) {
  const { key, v, ns, background, ...options } = index;
  return options;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('Set MONGO_URI in e-commercebackend/.env before running this migration.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const documentsByCollection = new Map();
  const maps = new Map();

  for (const name of COLLECTIONS) {
    const documents = await db.collection(name).find({}).toArray();
    documentsByCollection.set(name, documents);
    maps.set(name, makeIdMap(documents));
  }

  const migratedDocuments = remapDocuments(documentsByCollection, maps);
  console.log('UUID migration plan:');
  for (const name of COLLECTIONS) {
    const changed = documentsByCollection.get(name).filter((document) => !UUID_V4.test(idKey(document._id))).length;
    console.log(`  ${name}: ${documentsByCollection.get(name).length} documents, ${changed} IDs to convert`);
  }

  if (!APPLY) {
    console.log('Dry run only. Review the counts, back up MongoDB, then rerun with --apply to migrate.');
    return;
  }

  const suffix = `uuid_backup_${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;
  const staged = [];
  const collectionExists = async (name) =>
    (await db.listCollections({ name }, { nameOnly: true }).hasNext());
  const temporarySuffix = `uuid_tmp_${Date.now()}`;

  try {
    for (const name of COLLECTIONS) {
      const temporaryName = `${name}_${temporarySuffix}`;
      const backupName = `${name}_${suffix}`;
      const existing = await db.listCollections({ name: { $in: [temporaryName, backupName] } }).toArray();
      if (existing.length) throw new Error(`Migration staging collection already exists: ${existing[0].name}`);

      const source = db.collection(name);
      const sourceExists = await collectionExists(name);
      const temporary = await db.createCollection(temporaryName);
      staged.push({ name, temporaryName, backupName, sourceExists });
      const indexes = sourceExists ? await source.listIndexes().toArray() : [];
      for (const index of indexes) {
        if (index.name !== '_id_') await temporary.createIndex(index.key, indexOptions(index));
      }
      const documents = migratedDocuments.get(name);
      if (documents.length) await temporary.insertMany(documents, { ordered: true });
    }

    for (const entry of staged) {
      if (entry.sourceExists) await db.collection(entry.name).rename(entry.backupName);
      try {
        await db.collection(entry.temporaryName).rename(entry.name);
      } catch (error) {
        await db.collection(entry.backupName).rename(entry.name);
        throw error;
      }
    }

    console.log('Migration complete. Original collections are retained as backups:');
    for (const entry of staged) console.log(`  ${entry.backupName}`);
    console.log('Existing access tokens contain old user IDs; users need to sign in again.');
  } catch (error) {
    console.error('Migration failed. Restoring original collections where possible...');
    for (const entry of [...staged].reverse()) {
      try {
        const backupExists = await collectionExists(entry.backupName);
        if (backupExists) {
          if (await collectionExists(entry.name)) await db.collection(entry.name).drop();
          await db.collection(entry.backupName).rename(entry.name);
        } else if (!entry.sourceExists && await collectionExists(entry.name)) {
          await db.collection(entry.name).drop();
        }
        if (await collectionExists(entry.temporaryName)) await db.collection(entry.temporaryName).drop();
      } catch (rollbackError) {
        console.error(`Could not restore ${entry.name}. Keep the database stopped and inspect ${entry.backupName}:`, rollbackError);
      }
    }
    console.error('Migration did not complete cleanly. Check the collection names before restarting the application.');
    console.error('Staged collections:', staged.map((entry) => entry.temporaryName).join(', '));
    console.error('Backups:', staged.map((entry) => entry.backupName).join(', '));
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
