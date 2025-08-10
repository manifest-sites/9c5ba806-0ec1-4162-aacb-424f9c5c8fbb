import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Household.json";
export const Household = createEntityClient("Household", schema);
