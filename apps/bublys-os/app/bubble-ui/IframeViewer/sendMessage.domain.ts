type ParamValue = 
string | 
number | 
boolean | 
null | 
undefined | 
ParamValue[] | 
{ [key: string]: ParamValue };

//MCPに習った書き方のメッセージjson形式
export interface Message {
  protocol: string,
  version: string,
  method: string,
  params: {
    [key: string]: ParamValue;
  },
  id: string,
  timestamp: number
}