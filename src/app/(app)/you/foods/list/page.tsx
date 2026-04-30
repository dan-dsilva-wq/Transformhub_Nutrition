import { redirect } from "next/navigation";

export default function FoodsListPage() {
  redirect("/you/settings#foods-to-skip");
}
