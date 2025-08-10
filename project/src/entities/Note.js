import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Note.json";
export const Note = createEntityClient("Note", schema);
