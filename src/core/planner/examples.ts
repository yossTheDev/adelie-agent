import { getLogicExamples } from "../actions/logic/examples.js";
import { getFSExamples } from "../actions/file-system/examples.js";
import { getStateExamples } from "../actions/state/examples.js";

export const getExamples = () => {
  `EXAMPLES:

  ${getFSExamples()}

  ${getStateExamples()}

  ${getLogicExamples()}
`;
};
