import { getLogicExamples } from "../actions/logic/examples.js";
import { getFSExamples } from "../actions/file-system/examples.js";
import { getStateExamples } from "../actions/state/examples.js";

// ${getStateExamples()}
// ${getFSExamples()}

export const getExamples = () => {
  `EXAMPLES:

  ${getLogicExamples()}
`;
};
