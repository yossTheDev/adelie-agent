import type { ActionResult } from "../../../types/action-result.js";
import { callOllama } from "../../llm/llm.js";

const toBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off", ""].includes(normalized)) return false;
  }
  return Boolean(value);
};

const toNumber = (value: any): number | null => {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const boolResult = (value: boolean): ActionResult => [
  true,
  value ? "TRUE" : "FALSE",
];

/**
 * LOGIC_GATE (AI-based, flexible but controlled)
 */
export const logicGate = async (args: {
  condition: string;
  data: string;
}): Promise<ActionResult> => {
  try {
    const prompt = `
      [LOGIC GATE]
      DATA: "${args.data}"
      CONDITION: "${args.condition}"

      Return ONLY "TRUE" or "FALSE".
    `;
    const result = await callOllama(prompt, undefined, false);
    const clean = (result as string).trim().toUpperCase();

    return [true, clean.includes("TRUE") ? "TRUE" : "FALSE"];
  } catch (e) {
    return [false, `LOGIC_GATE Error: ${String(e)}`];
  }
};

/**
 * COUNT
 */
export const countItems = (args: {
  items: string[] | string;
}): ActionResult => {
  try {
    if (!args.items) return [true, "0"];

    let list: string[] = [];

    if (Array.isArray(args.items)) {
      list = args.items;
    } else {
      list = String(args.items)
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
    }

    return [true, String(list.length)];
  } catch (e) {
    return [false, `COUNT Error: ${String(e)}`];
  }
};

/**
 * IS_EMPTY
 */
export const isEmpty = (args: { data: any }): ActionResult => {
  try {
    if (!args.data) return [true, "TRUE"];

    const value = Array.isArray(args.data)
      ? args.data.length === 0
      : String(args.data).trim().length === 0;

    return [true, value ? "TRUE" : "FALSE"];
  } catch (e) {
    return [false, `IS_EMPTY Error: ${String(e)}`];
  }
};

/**
 * EQUALS
 */
export const equals = (args: { a: any; b: any }): ActionResult => {
  try {
    return [true, String(args.a) === String(args.b) ? "TRUE" : "FALSE"];
  } catch (e) {
    return [false, `EQUALS Error: ${String(e)}`];
  }
};

/**
 * CONTAINS
 */
export const contains = (args: {
  data: string;
  value: string;
}): ActionResult => {
  try {
    if (!args.data) return [true, "FALSE"];
    return [
      true,
      String(args.data).includes(String(args.value)) ? "TRUE" : "FALSE",
    ];
  } catch (e) {
    return [false, `CONTAINS Error: ${String(e)}`];
  }
};

/**
 * NOT
 */
export const not = (args: { value: any }): ActionResult => {
  try {
    return boolResult(!toBoolean(args.value));
  } catch (e) {
    return [false, `NOT Error: ${String(e)}`];
  }
};

/**
 * AND
 */
export const and = (args: { a: any; b: any }): ActionResult => {
  try {
    return boolResult(toBoolean(args.a) && toBoolean(args.b));
  } catch (e) {
    return [false, `AND Error: ${String(e)}`];
  }
};

/**
 * OR
 */
export const or = (args: { a: any; b: any }): ActionResult => {
  try {
    return boolResult(toBoolean(args.a) || toBoolean(args.b));
  } catch (e) {
    return [false, `OR Error: ${String(e)}`];
  }
};

/**
 * XOR
 */
export const xor = (args: { a: any; b: any }): ActionResult => {
  try {
    const left = toBoolean(args.a);
    const right = toBoolean(args.b);
    return boolResult(left !== right);
  } catch (e) {
    return [false, `XOR Error: ${String(e)}`];
  }
};

/**
 * NAND
 */
export const nand = (args: { a: any; b: any }): ActionResult => {
  try {
    return boolResult(!(toBoolean(args.a) && toBoolean(args.b)));
  } catch (e) {
    return [false, `NAND Error: ${String(e)}`];
  }
};

/**
 * NOR
 */
export const nor = (args: { a: any; b: any }): ActionResult => {
  try {
    return boolResult(!(toBoolean(args.a) || toBoolean(args.b)));
  } catch (e) {
    return [false, `NOR Error: ${String(e)}`];
  }
};

/**
 * GREATER_THAN
 */
export const greaterThan = (args: { a: any; b: any }): ActionResult => {
  try {
    const a = toNumber(args.a);
    const b = toNumber(args.b);
    if (a === null || b === null) return [false, "GREATER_THAN requires numbers"];
    return boolResult(a > b);
  } catch (e) {
    return [false, `GREATER_THAN Error: ${String(e)}`];
  }
};

/**
 * GREATER_OR_EQUALS
 */
export const greaterOrEquals = (args: { a: any; b: any }): ActionResult => {
  try {
    const a = toNumber(args.a);
    const b = toNumber(args.b);
    if (a === null || b === null) {
      return [false, "GREATER_OR_EQUALS requires numbers"];
    }
    return boolResult(a >= b);
  } catch (e) {
    return [false, `GREATER_OR_EQUALS Error: ${String(e)}`];
  }
};

/**
 * LESS_THAN
 */
export const lessThan = (args: { a: any; b: any }): ActionResult => {
  try {
    const a = toNumber(args.a);
    const b = toNumber(args.b);
    if (a === null || b === null) return [false, "LESS_THAN requires numbers"];
    return boolResult(a < b);
  } catch (e) {
    return [false, `LESS_THAN Error: ${String(e)}`];
  }
};

/**
 * LESS_OR_EQUALS
 */
export const lessOrEquals = (args: { a: any; b: any }): ActionResult => {
  try {
    const a = toNumber(args.a);
    const b = toNumber(args.b);
    if (a === null || b === null) return [false, "LESS_OR_EQUALS requires numbers"];
    return boolResult(a <= b);
  } catch (e) {
    return [false, `LESS_OR_EQUALS Error: ${String(e)}`];
  }
};

/**
 * FOR_EACH (structural)
 */
export const forEach = (args: {
  items: any;
  template: any[];
}): ActionResult => {
  try {
    if (!args.items) return [false, "FOR_EACH requires items"];
    if (!args.template) return [false, "FOR_EACH requires template"];

    return [
      true,
      JSON.stringify({
        type: "FOR_EACH",
        items: args.items,
        template: args.template,
      }),
    ];
  } catch (e) {
    return [false, `FOR_EACH Error: ${String(e)}`];
  }
};

/**
 * IF (structural)
 */
export const ifAction = (args: {
  condition: string;
  then: any[];
  else?: any[];
}): ActionResult => {
  try {
    return [
      true,
      JSON.stringify({
        type: "IF",
        condition: args.condition,
        then: args.then,
        else: args.else || [],
      }),
    ];
  } catch (e) {
    return [false, `IF Error: ${String(e)}`];
  }
};

/**
 * WHILE (structural - cuidado con loops infinitos)
 */
export const whileAction = (args: {
  condition: string;
  body: any[];
}): ActionResult => {
  try {
    return [
      true,
      JSON.stringify({
        type: "WHILE",
        condition: args.condition,
        body: args.body,
      }),
    ];
  } catch (e) {
    return [false, `WHILE Error: ${String(e)}`];
  }
};

export const ACTIONS: Record<
  string,
  (args: any) => ActionResult | Promise<ActionResult>
> = {
  LOGIC_GATE: (args) => logicGate(args),
  COUNT: (args) => countItems(args),
  IS_EMPTY: (args) => isEmpty(args),
  EQUALS: (args) => equals(args),
  CONTAINS: (args) => contains(args),
  NOT: (args) => not(args),
  AND: (args) => and(args),
  OR: (args) => or(args),
  XOR: (args) => xor(args),
  NAND: (args) => nand(args),
  NOR: (args) => nor(args),
  GREATER_THAN: (args) => greaterThan(args),
  GREATER_OR_EQUALS: (args) => greaterOrEquals(args),
  LESS_THAN: (args) => lessThan(args),
  LESS_OR_EQUALS: (args) => lessOrEquals(args),

  FOR_EACH: (args) => forEach(args),
  IF: (args) => ifAction(args),
  WHILE: (args) => whileAction(args),
};

export const ACTION_ARGS: Record<string, string[]> = {
  LOGIC_GATE: ["condition", "data"],
  COUNT: ["items"],
  IS_EMPTY: ["data"],
  EQUALS: ["a", "b"],
  CONTAINS: ["data", "value"],
  NOT: ["value"],
  AND: ["a", "b"],
  OR: ["a", "b"],
  XOR: ["a", "b"],
  NAND: ["a", "b"],
  NOR: ["a", "b"],
  GREATER_THAN: ["a", "b"],
  GREATER_OR_EQUALS: ["a", "b"],
  LESS_THAN: ["a", "b"],
  LESS_OR_EQUALS: ["a", "b"],

  FOR_EACH: ["items", "template"],
  IF: ["condition", "then", "else"],
  WHILE: ["condition", "body"],
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  LOGIC_GATE:
    "AI-based condition evaluation. Use for flexible conditions when deterministic checks are not enough.",

  COUNT:
    "Counts items in a list or comma-separated string. Returns a number as string.",

  IS_EMPTY:
    "Returns TRUE if the data is empty (empty string, null, undefined, or empty list).",

  EQUALS: "Returns TRUE if two values are equal (string comparison).",

  CONTAINS: "Returns TRUE if 'data' contains the specified 'value'.",
  NOT: "Returns TRUE when 'value' is logically FALSE.",
  AND: "Returns TRUE only when both 'a' and 'b' are TRUE.",
  OR: "Returns TRUE when either 'a' or 'b' is TRUE.",
  XOR: "Returns TRUE when exactly one of 'a' and 'b' is TRUE.",
  NAND: "Returns TRUE unless both 'a' and 'b' are TRUE.",
  NOR: "Returns TRUE only when both 'a' and 'b' are FALSE.",
  GREATER_THAN: "Returns TRUE when numeric 'a' > numeric 'b'.",
  GREATER_OR_EQUALS: "Returns TRUE when numeric 'a' >= numeric 'b'.",
  LESS_THAN: "Returns TRUE when numeric 'a' < numeric 'b'.",
  LESS_OR_EQUALS: "Returns TRUE when numeric 'a' <= numeric 'b'.",

  FOR_EACH:
    "Iterates over a list and executes a template per item. Use $$item inside template.",

  IF: "Executes 'then' actions if condition is TRUE, otherwise executes 'else' actions.",

  WHILE:
    "Executes actions repeatedly while condition is TRUE. Use with caution to avoid infinite loops.",
};
