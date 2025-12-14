import { createOnshapeApiClient } from "./generated-wrapper";
import { useEffect, useState } from "react";
import type { Client } from "./generated/client/types.gen";

export function useOnshapeClient() {
  const [client, setClient] = useState<Client | undefined>(undefined);
  useEffect(() => {
    createOnshapeApiClient().then((client) => {
      setClient(client);
    });
  }, []);
  return client;
}
