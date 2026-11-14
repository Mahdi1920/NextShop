"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Breadcrumbs,
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { Theme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import StoreIcon from "@mui/icons-material/Store";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { Badge } from "@mui/material";
import { useSocket } from "@shared/context/socket-context";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import CategoryIcon from "@mui/icons-material/Category";

import { useSession } from "@shared/context/session-context";
import { useLocale, useTranslations, type TranslationKey } from "@shared/context/locale-context";
import type { UserRole } from "@shared/api/users";
import { Locale, UserRole as UserRoleEnum } from "@shared/enums";
import { RouteGuard } from "@shared/components/auth/RouteGuard";
import { Modal } from "@shared/components/ui/modal";
import { apiClient } from "@shared/api/clients";
import type { NotificationItem } from "@shared/api/notifications";

const drawerWidth = 260;
const collapsedDrawerWidth = 72;

function formatNotificationAge(createdAt: string, locale: string): string {
  const seconds = Math.round((new Date(createdAt).getTime() - Date.now()) / 1000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return relative.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

type NavItem = {
  label: TranslationKey;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
};

function getNavItems(role: UserRole | null): NavItem[] {
  const commonItems: NavItem[] = [
    {
      label: "NAVBAR.HOME",
      href: "/home",
      icon: <HomeIcon />,
    },
    { 
      label: "NAVBAR.PROFILE", 
      href: "/profile",  
      icon: <PersonIcon /> 
    },
  ];
  const roleItems: Partial<Record<UserRole, NavItem[]>> = {
    [UserRoleEnum.ADMIN]: [
      { label: "NAVBAR.USERS", href: "/users", icon: <PeopleIcon /> },
      { label: "NAVBAR.ORDERS", href: "/orders", icon: <ReceiptLongIcon /> },
      { label: "NAVBAR.CATEGORIES", href: "/categories", icon: <CategoryIcon /> },
      { label: "NAVBAR.PRODUCTS", href: "/products", icon: <Inventory2Icon /> },
    ],
    [UserRoleEnum.SELLER]: [
      //{ label: "NAVBAR.SELLER", href: "/seller", icon: <StoreIcon /> },
      { label: "NAVBAR.STORE", href: "/seller/store", icon: <StoreIcon /> },
      { label: "NAVBAR.ORDERS", href: "/seller/orders", icon: <ReceiptLongIcon /> },
      { label: "NAVBAR.PRODUCTS", href: "/seller/products", icon: <Inventory2Icon /> },
    ],
    [UserRoleEnum.CUSTOMER]: [
      { label: "NAVBAR.ORDERS", href: "/customer/orders", icon: <ReceiptLongIcon /> },
      { label: "NAVBAR.PRODUCTS", href: "/customer/products", icon: <Inventory2Icon /> },
    ],
  };
  return [...commonItems, ...(role ? roleItems[role] ?? [] : [])];
}

const breadcrumbKeys: Record<string, TranslationKey> = {
  home: "BREADCRUMBS.HOME",
  profile: "BREADCRUMBS.PROFILE",
  users: "BREADCRUMBS.USERS",
  categories: "BREADCRUMBS.CATEGORIES",
  products: "BREADCRUMBS.PRODUCTS",
  orders: "NAVBAR.ORDERS",
  seller: "BREADCRUMBS.SELLER",
  customer: "BREADCRUMBS.CUSTOMER",
  auth: "BREADCRUMBS.AUTHENTICATION",
  "sign-in": "BREADCRUMBS.SIGN_IN",
  "sign-up": "BREADCRUMBS.SIGN_UP",
  checkout: "ORDER_PAGE.CHECKOUT",
  "verify-email": "BREADCRUMBS.VERIFY_EMAIL",
  password: "BREADCRUMBS.PASSWORD",
  "forgot-password": "BREADCRUMBS.FORGOT_PASSWORD",
  "reset-password": "BREADCRUMBS.RESET_PASSWORD",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { locale, setLocale } = useLocale();
  const t = useTranslations();

  const isAuthRoute = pathname?.startsWith("/auth");
  const showChrome = !isAuthRoute;

  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [desktopOpen, setDesktopOpen] = React.useState(true);

  const navItems = React.useMemo(() => getNavItems(session.role), [session.role]);

  React.useEffect(() => {
    if (!session.isAuthenticated || isAuthRoute) return;
    const reportPresence = () => {
      if (document.visibilityState === "visible") {
        void apiClient.post("/users/me/presence").catch(() => undefined);
      }
    };
    reportPresence();
    const timer = window.setInterval(reportPresence, 30_000);
    document.addEventListener("visibilitychange", reportPresence);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", reportPresence);
    };
  }, [session.isAuthenticated, isAuthRoute]);

  const breadcrumbs = React.useMemo(() => {
    let href = "";
    return (pathname ?? "").split("/").filter(Boolean).flatMap((segment: string) => {
      href += `/${segment}`;
      const key = breadcrumbKeys[segment];
      return key ? [{ href, key }] : [];
    });
  }, [pathname]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleNav = () => {
    if (isDesktop) setDesktopOpen((v) => !v);
    else setMobileOpen((v) => !v);
  };

  const [profileAnchor, setProfileAnchor] = React.useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchor);

  const [langAnchor, setLangAnchor] = React.useState<null | HTMLElement>(null);
  const { isConnected, notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [cartCount, setCartCount] = React.useState(0);
  const [notifAnchor, setNotifAnchor] = React.useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = React.useState<NotificationItem | null>(null);
  const notifMenuOpen = Boolean(notifAnchor);
  const langMenuOpen = Boolean(langAnchor);

  React.useEffect(() => {
    if (session.role !== UserRoleEnum.CUSTOMER) {
      setCartCount(0);
      return;
    }
    const key = `nextshop-cart-v2-${session.user?.email ?? "customer"}`;
    const refreshCartCount = () => {
      try {
        const lines = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
        setCartCount(lines.length);
      } catch {
        setCartCount(0);
      }
    };
    refreshCartCount();
    window.addEventListener("storage", refreshCartCount);
    window.addEventListener("nextshop:cart-changed", refreshCartCount);
    return () => {
      window.removeEventListener("storage", refreshCartCount);
      window.removeEventListener("nextshop:cart-changed", refreshCartCount);
    };
  }, [session.role, session.user?.email]);

  const onLogout = () => {
    setProfileAnchor(null);
    session.logout("logout");
  };

  const onProfile = () => {
    setProfileAnchor(null);
    router.push("/profile");
  };

  const setLang = (next: Locale) => {
    setLangAnchor(null);
    setLocale(next);
  };

  const isCollapsed = isDesktop && !desktopOpen;
  const desktopDrawerWidth = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  const authIconButtonSx = showChrome ? undefined : {
    color: "#fff",
    bgcolor: "rgba(255,255,255,0.12)",
    "&:hover": { bgcolor: "rgba(255,255,255,0.22)" },
  };
  const lastWeekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastWeekNotifications = notifications.filter((notification) => {
    const createdAt = new Date(notification.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt >= lastWeekCutoff;
  });

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          px: 2,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: 1.5,
        }}
      >
        <Tooltip
          title={
            session.user
              ? `${session.user.fullname ?? session.user.username ?? "User"} (${session.role ?? ""})`
              : t("NAVBAR.PROFILE")
          }
          placement="right"
          disableHoverListener={!isCollapsed}
        >
          <Avatar
            src={session.user?.avatar ?? undefined}
            alt={session.user?.fullname ?? session.user?.username ?? "User"}
            sx={{ width: isCollapsed ? 40 : 44, height: isCollapsed ? 40 : 44 }}
          />
        </Tooltip>

        {!isCollapsed ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800} noWrap>
              {session.user?.fullname ?? session.user?.username ?? "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {session.role ?? ""}
            </Typography>
          </Box>
        ) : null}
      </Box>
      <Divider />
      <List sx={{ py: 1 }}>
        {navItems.map((item) => {
          const itemPath = item.href.split("#")[0];
          const selected = pathname === itemPath || pathname?.startsWith(`${itemPath}/`);
          const button = (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              sx={{ mx: 1, borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              {!isCollapsed ? <ListItemText primary={t(item.label)} /> : null}
            </ListItemButton>
          );

          return isCollapsed ? (
            <Tooltip key={item.href} title={t(item.label)} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>
        <Box sx={{ flex: 1 }} />
      <Divider />
      <Box sx={{ p: 1 }}>
        <ListItemButton onClick={onLogout} sx={{ borderRadius: 1 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          {!isCollapsed ? <ListItemText primary={t("NAVBAR.LOGOUT")} /> : null}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <RouteGuard>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: showChrome ? (t) => `1px solid ${t.palette.divider}` : "none",
          backgroundColor: showChrome ? (t) => t.palette.background.paper : "transparent",
          color: showChrome ? (t) => t.palette.text.primary : "#fff",
          boxShadow: showChrome ? undefined : "none",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {showChrome ? (
            <IconButton edge="start" onClick={toggleNav} aria-label={t("NAVBAR.TOGGLE")}>
              <MenuIcon />
            </IconButton>
          ) : null}

          <Box component={Link} href="/home" aria-label="NextShop home" sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "inherit", textDecoration: "none" }}>
            <Box component="img" src="/icon.png" alt="NextShop" sx={{ width: 36, height: 36, objectFit: "contain", borderRadius: 1 }} />
            <Typography variant="subtitle1" fontWeight={800}>NextShop</Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Tooltip title={t("NAVBAR.CART")}>
            <IconButton sx={authIconButtonSx} aria-label={t("NAVBAR.CART")} onClick={() => router.push(session.user ? "/customer/checkout" : "/auth/sign-in")}>
              <Badge badgeContent={cartCount} color="error" max={99}>
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {showChrome && session.isAuthenticated ? (
            <>
              <Tooltip title={t("NAVBAR.NOTIFICATIONS")}>
                <IconButton
                  sx={authIconButtonSx}
                  aria-label={`${t("NAVBAR.NOTIFICATIONS")}: ${unreadCount}`}
                  onClick={(event) => setNotifAnchor(event.currentTarget)}
                >
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={notifAnchor}
                open={notifMenuOpen}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                  paper: {
                    sx: {
                      width: 380,
                      maxWidth: "calc(100vw - 24px)",
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: "0 18px 55px rgba(15, 23, 42, 0.2)",
                    },
                  },
                }}
              >
                <Box sx={{ px: 2.25, py: 2, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6" fontWeight={800}>{t("NAVBAR.NOTIFICATIONS")}</Typography>
                        {unreadCount > 0 ? <Chip label={unreadCount > 99 ? "99+" : unreadCount} size="small" color="primary" sx={{ height: 22, fontWeight: 700 }} /> : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{t("NAVBAR.LAST_7_DAYS")}</Typography>
                    </Box>
                    <Button size="small" disabled={!unreadCount} onClick={() => void markAllAsRead()} sx={{ minWidth: 0, whiteSpace: "nowrap", fontWeight: 700 }}>
                      {t("NAVBAR.MARK_ALL_READ")}
                    </Button>
                  </Stack>
                </Box>
                <Box sx={{ maxHeight: 430, overflowY: "auto", bgcolor: "background.default" }}>
                  {lastWeekNotifications.length ? lastWeekNotifications.slice(0, 8).map((notification) => {
                    const notificationIcon = notification.type.includes("ORDER")
                      ? <ShoppingBagOutlinedIcon fontSize="small" />
                      : notification.type.includes("PRODUCT")
                        ? <Inventory2OutlinedIcon fontSize="small" />
                        : <NotificationsNoneIcon fontSize="small" />;

                    return (
                      <ButtonBase
                        key={notification._id}
                        onClick={() => {
                          if (!notification.isRead) void markAsRead(notification._id);
                          setNotifAnchor(null);
                          setSelectedNotification(notification);
                        }}
                        sx={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "flex-start",
                          textAlign: "start",
                          px: 2.25,
                          py: 1.75,
                          gap: 1.5,
                          borderBottom: 1,
                          borderColor: "divider",
                          bgcolor: notification.isRead ? "background.paper" : "action.hover",
                          transition: "background-color 120ms ease",
                          "&:hover": { bgcolor: "action.selected" },
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                            bgcolor: notification.isRead ? "grey.100" : "primary.light",
                            color: notification.isRead ? "text.secondary" : "primary.dark",
                          }}
                        >
                          {notificationIcon}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Typography variant="body2" fontWeight={notification.isRead ? 600 : 800} noWrap>
                              {notification.title}
                            </Typography>
                            {!notification.isRead ? <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} /> : null}
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.45, mt: 0.25 }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.5 }}>
                            {formatNotificationAge(notification.createdAt, locale)}
                          </Typography>
                        </Box>
                      </ButtonBase>
                    );
                  }) : (
                    <Stack alignItems="center" spacing={1} sx={{ py: 5, px: 2, bgcolor: "background.paper" }}>
                      <Avatar sx={{ width: 48, height: 48, bgcolor: "action.hover", color: "text.secondary" }}>
                        <NotificationsNoneIcon />
                      </Avatar>
                      <Typography variant="body2" fontWeight={700}>{t("NAVBAR.NO_NOTIFICATIONS")}</Typography>
                      <Typography variant="caption" color="text.secondary">{t("NAVBAR.LAST_7_DAYS")}</Typography>
                    </Stack>
                  )}
                </Box>
              </Menu>
              <Modal
                open={Boolean(selectedNotification)}
                onClose={() => setSelectedNotification(null)}
                size="md"
                title={selectedNotification?.title}
                footer={<Button onClick={() => setSelectedNotification(null)}>{t("NAVBAR.CLOSE")}</Button>}
              >
                {selectedNotification ? (
                  <Stack spacing={2}>
                      <Box>
                        <Typography variant="overline" color="text.secondary">{t("NAVBAR.NOTIFICATION_TYPE")}</Typography>
                        <Typography variant="body2">{selectedNotification.type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="overline" color="text.secondary">{t("NAVBAR.NOTIFICATION_DATE")}</Typography>
                        <Typography variant="body2">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Tunis" }).format(new Date(selectedNotification.createdAt))}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="overline" color="text.secondary">{t("NAVBAR.NOTIFICATION_MESSAGE")}</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{selectedNotification.message}</Typography>
                      </Box>
                      {selectedNotification.data && Object.keys(selectedNotification.data).length ? (
                        <Box>
                          <Typography variant="overline" color="text.secondary">{t("NAVBAR.NOTIFICATION_DETAILS")}</Typography>
                          <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                            {Object.entries(selectedNotification.data).map(([key, value]) => (
                              <Stack key={key} direction="row" spacing={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight={700}>{key}:</Typography>
                                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{typeof value === "string" ? value : JSON.stringify(value)}</Typography>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}
                  </Stack>
                ) : null}
              </Modal>
            </>
          ) : null}

          <Tooltip title={t("NAVBAR.LANGUAGE")}>
            <IconButton sx={authIconButtonSx} onClick={(e) => setLangAnchor(e.currentTarget)} aria-label={t("NAVBAR.CHANGE_LANGUAGE")}>
              <Box
                component="img"
                src={locale === Locale.FRENCH
                  ? "https://flagcdn.com/w40/fr.png"
                  : locale === Locale.ARABIC
                    ? "https://flagcdn.com/w40/sa.png"
                    : "https://flagcdn.com/w40/gb.png"}
                alt=""
                sx={{ width: 24, height: 24, objectFit: "cover", borderRadius: "50%", border: "1px solid", borderColor: "divider" }}
              />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={langAnchor}
            open={langMenuOpen}
            onClose={() => setLangAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem selected={locale === Locale.ENGLISH} onClick={() => setLang(Locale.ENGLISH)}>
              <Box component="img" src="https://flagcdn.com/w40/gb.png" alt="" sx={{ width: 22, height: 16, objectFit: "cover", mr: 1.5 }} />
              {t("LANGUAGE.ENGLISH")}
            </MenuItem>
            <MenuItem selected={locale === Locale.FRENCH} onClick={() => setLang(Locale.FRENCH)}>
              <Box component="img" src="https://flagcdn.com/w40/fr.png" alt="" sx={{ width: 22, height: 16, objectFit: "cover", mr: 1.5 }} />
              {t("LANGUAGE.FRENCH")}
            </MenuItem>
            <MenuItem selected={locale === Locale.ARABIC} onClick={() => setLang(Locale.ARABIC)}>
              <Box component="img" src="https://flagcdn.com/w40/sa.png" alt="" sx={{ width: 22, height: 16, objectFit: "cover", mr: 1.5 }} />
              {t("LANGUAGE.ARABIC")}
            </MenuItem>
          </Menu>

          {showChrome ? <Tooltip title={t("NAVBAR.PROFILE")}>
            <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} aria-label={t("NAVBAR.OPEN_PROFILE")}>
              <Avatar
                src={session.user?.avatar ?? undefined}
                alt={session.user?.fullname ?? "User"}
                sx={{ width: 32, height: 32 }}
              />
            </IconButton>
          </Tooltip> : null}
          {showChrome ? <Menu
            anchorEl={profileAnchor}
            open={profileMenuOpen}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={onProfile}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              {t("NAVBAR.PROFILE")}
            </MenuItem>
            <MenuItem onClick={onLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              {t("NAVBAR.LOGOUT")}
            </MenuItem>
          </Menu> : null}
        </Toolbar>
      </AppBar>

      {/* Desktop drawer */}
      {showChrome && isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: desktopDrawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: desktopDrawerWidth,
              boxSizing: "border-box",
              overflowX: "hidden",
              transition: (t) =>
                t.transitions.create("width", {
                  easing: t.transitions.easing.sharp,
                  duration: t.transitions.duration.shortest,
                }),
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile drawer */}
      {showChrome && !isDesktop && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleNav}
          ModalProps={{ keepMounted: true }}
          sx={{
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {showChrome ? <Toolbar /> : null}
        {showChrome && breadcrumbs.length ? (
          <Breadcrumbs
            aria-label={t("BREADCRUMBS.LABEL")}
            sx={{
              px: { xs: 2, md: 3 },
              pt: showChrome ? 2 : 0,
              ...(showChrome ? {} : {
                position: "fixed",
                top: { xs: 64, sm: 72 },
                left: locale === "ar" ? "auto" : { xs: 16, md: 24 },
                right: locale === "ar" ? { xs: 16, md: 24 } : "auto",
                zIndex: (t) => t.zIndex.appBar + 1,
                color: "rgba(255,255,255,0.82)",
                "& .MuiBreadcrumbs-separator": { color: "rgba(255,255,255,0.6)" },
              }),
            }}
          >
            {breadcrumbs.map((crumb: { href: string; key: any }, index: number) => index === breadcrumbs.length - 1 ? (
              <Typography key={crumb.href} color={showChrome ? "text.primary" : "inherit"} variant="body2">{t(crumb.key)}</Typography>
            ) : (
              <Box key={crumb.href} component={Link} href={crumb.href} sx={{ color: showChrome ? "text.secondary" : "inherit", textDecoration: "none", typography: "body2" }}>
                {t(crumb.key)}
              </Box>
            ))}
          </Breadcrumbs>
        ) : null}
        <Box sx={{ p: showChrome ? { xs: 2, md: 3 } : 0, flex: 1 }}>{children}</Box>
      </Box>
        </Box>
    </RouteGuard>
  );
}
