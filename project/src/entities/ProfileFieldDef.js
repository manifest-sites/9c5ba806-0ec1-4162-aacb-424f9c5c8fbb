import { createEntityClient } from "../utils/entityWrapper";
import schema from "./ProfileFieldDef.json";
export const ProfileFieldDef = createEntityClient("ProfileFieldDef", schema);
