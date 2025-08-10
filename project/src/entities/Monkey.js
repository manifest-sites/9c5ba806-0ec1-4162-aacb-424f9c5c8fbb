import { createEntityClient } from "../utils/entityWrapper";
import schema from "./Monkey.json";
export const Monkey = createEntityClient("Monkey", schema);
