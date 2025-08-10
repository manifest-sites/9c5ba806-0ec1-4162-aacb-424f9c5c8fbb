import { createEntityClient } from "../utils/entityWrapper";
import schema from "./HouseholdMember.json";
export const HouseholdMember = createEntityClient("HouseholdMember", schema);
