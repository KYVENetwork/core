import { Observable, Subscriber } from "rxjs";

// Uploader types.

export type Tag = { name: string; value: string };
export type Tags = Tag[];

export interface UploadFunctionReturn {
  data: string;
  tags?: Tags;
}

export type UploadFunction<ConfigType> = (
  subscriber: Subscriber<UploadFunctionReturn>,
  config: ConfigType
) => void;

// Listener types.

export type Bundle = UploadFunctionReturn[];

export interface ListenFunctionReturn {
  transaction: string;
  bundle: Bundle;
}

// Validator types.

export interface ValidateFunctionReturn {
  transaction: string;
  valid: boolean;
}

export type ValidateFunction<ConfigType> = (
  listener: Observable<ListenFunctionReturn>,
  subscriber: Subscriber<ValidateFunctionReturn>,
  config: ConfigType
) => void;
