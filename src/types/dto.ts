export interface DataItem {
  key: string;
  value: any;
}

export interface Bundle {
  fromHeight: number;
  toHeight: number;
  bundle: DataItem[];
  toKey: string;
  toValue: string;
}
