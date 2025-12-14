import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { UserRow } from "~/lib/supabase/database.types";

type UsersListProps = {
  onSelect: (user: UserRow) => void;
};

export function UsersList({ onSelect }: UsersListProps) {
  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  console.log(users);

  return (
    <div className="flex flex-col gap-2">
      {users?.map((user: any) => (
        <div
          className="hover:bg-primary/10 flex cursor-pointer items-center gap-3 rounded-md border p-2"
          key={user.onshape_user_id}
          onClick={() => onSelect(user)}
        >
          <User className="text-primary size-4" />
          {user.name}
        </div>
      ))}
    </div>
  );
}
