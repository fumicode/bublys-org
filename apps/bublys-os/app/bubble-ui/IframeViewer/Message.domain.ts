//MCPに習った書き方のメッセージjson形式
export interface Message {
  protocol: string;
  version: string;
  method: string;
  params: any;
  id: string;
  timestamp: number;
}
