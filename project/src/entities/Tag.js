import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Tag.json";
export const Tag = createEntityClient("Tag", schema);
