"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AccountOption = {
  id: string;
  name: string;
  mask: string | null;
  institutionName: string;
};

export default function AccountFilter({
  accounts,
  value,
}: {
  accounts: AccountOption[];
  value: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams);
    if (v === "all") params.delete("account");
    else params.set("account", v);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  if (accounts.length === 0) return null;

  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <SelectTrigger className="min-w-44">
        <SelectValue placeholder="All accounts" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All accounts</SelectItem>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.institutionName} · {a.name}
            {a.mask ? ` ··${a.mask}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
