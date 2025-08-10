import { createEntityClient } from "../utils/entityWrapper";
import schema from "./OrgMember.json";
export const OrgMember = createEntityClient("OrgMember", schema);
