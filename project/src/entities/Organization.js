import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Organization.json";
export const Organization = createEntityClient("Organization", schema);
