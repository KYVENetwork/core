export interface DataItem {
  key: string;
  value: any;
}

export interface Bundle {
  bundle: DataItem[];
  toKey: string;
  toValue: string;
}
