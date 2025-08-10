import { createEntityClient } from "../utils/entityWrapper";
import schema from "./User.json";
export const User = createEntityClient("User", schema);
