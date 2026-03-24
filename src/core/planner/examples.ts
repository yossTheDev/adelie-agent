import { getLogicExamples } from "../actions/logic/examples.js";
import { getFSExamples } from "../actions/file-system/examples.js";
import { getStateExamples } from "../actions/state/examples.js";
import { getMemoryExamples } from "../actions/memory/examples.js";

// ${getStateExamples()}
// ${getFSExamples()}
// ${getLogicExamples()}
export const getExamples = () => {
  return `EXAMPLES:

${getStateExamples()}

${getFSExamples()}

${getLogicExamples()}

${getMemoryExamples()}
`;
};
