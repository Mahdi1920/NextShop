import type { UserRole } from "@shared/api/users";
import { UserRole as UserRoleEnum } from "@shared/enums";

export const appRoutes = {
  home: "/home",
  profile: "/profile",
  customer: "/customer",
  seller: "/seller",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
} as const;

type RouteRule = {
  prefix: string;
  roles?: UserRole[];
};

export const routeRules: RouteRule[] = [
  { prefix: "/seller", roles: [UserRoleEnum.SELLER] },
  { prefix: "/customer", roles: [UserRoleEnum.CUSTOMER] },
  { prefix: "/users", roles: [UserRoleEnum.ADMIN] },
  { prefix: "/categories", roles: [UserRoleEnum.ADMIN] },
  { prefix: "/products", roles: [UserRoleEnum.ADMIN] },
  { prefix: "/admin", roles: [UserRoleEnum.ADMIN] },
  { prefix: "/profile", roles: [UserRoleEnum.ADMIN, UserRoleEnum.CUSTOMER, UserRoleEnum.SELLER] },
  { prefix: "/home", roles: [UserRoleEnum.ADMIN, UserRoleEnum.CUSTOMER, UserRoleEnum.SELLER] },
];

export function getRouteRule(pathname: string): RouteRule | null {
  return (
    routeRules.find(
      (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
    ) ?? null
  );
}

export function getRoleHome(role: UserRole | null | undefined): string {
  if (role === UserRoleEnum.ADMIN) return appRoutes.home;
  if (role === UserRoleEnum.SELLER) return appRoutes.seller;
  return appRoutes.customer;
}
