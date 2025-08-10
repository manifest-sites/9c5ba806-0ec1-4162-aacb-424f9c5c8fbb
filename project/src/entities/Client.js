import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Client.json";
export const Client = createEntityClient("Client", schema);
