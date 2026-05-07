export type FillTrigger = { type: "trigger_fill" };
export type SnippetTrigger = { type: "trigger_snippet_picker" };
export type GetState = { type: "get_state" };

export type Message = FillTrigger | SnippetTrigger | GetState;
