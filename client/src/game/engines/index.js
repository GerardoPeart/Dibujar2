import free from "./free";
import pictionary from "./pictionary";

const engines = { free, pictionary };
export const getEngine = (mode) => engines[mode] || engines.free;
