//OSとバブリ間の基本的なメッセージ形式
//この形式に合致しないメッセージには反応しない
//MCPのメッセージ形式を参考にしている
export interface Message {
  protocol: string; //今は暫定的にアプリのURLをここに割り当てている。
  version: string; //今はまだ使っていない
  method: string; //アプリ内で定義されているメソッド名
  params: any; //アプリ内で定義されているメソッドのパラメータ
  id: string; //このメッセージのID(UUIDで作成される)
  timestamp: number; //このメッセージの送信時間
}

//バブリとOS間でデータをやり取りする際に使用するパラメータ
export interface DTOParams {
  containerURL: string; //バブリ内のデータのあるコンテナのURL
  value: any; //データの値
}

//--------- OSとバブリがデフォルトで認識できるメッセージ---------

// バブリまたはOSが自身のエクスポート可能なデータの一つをOSまたはバブリに送信するメッセージ
// バブリはこれを受信した時、paramsのcontainerURLに指定されたコンテナの値をparamsのvalueで置き換える。
// OSはこれを受け取った時、DTOParamsを保存し、そのcontainerURLのonChangeValueメッセージの監視を開始する。
// 更に、OS側からバブリにExportDataMessageを送った際は、そのcontainerURLを保存し、
// OSに保存されているDTOParamsのvalueが変更された際は、バブリにExportDataMessageを送る。
export interface ExportDataMessage extends Message {
  protocol: string;
  version: string;
  method: 'exportData';
  params: DTOParams;
  id: string;
  timestamp: number;
}

//--------- OSだけがデフォルトで認識できるメッセージ---------

// バブリはexport可能なデータに変更があった時、常にOSにexportDataを送り続ける。
// OSは普段はこれを無視するが、
// 保存されているDTOParamsのcontainerURLと同じcontainerURLを受け取った際は
// 保存されているDTOParamsのvalueをこのメッセージのvalueで置き換える。
// 更に、OS側からバブリにExportDataMessageを送った際は、
export interface OnChangeValueMessage extends Message {
  protocol: string;
  version: string;
  method: 'onChangeValue';
  params: DTOParams;
  id: string;
  timestamp: number;
}

//暫定
export interface HandShakeMessage extends Message {
  protocol: string;
  version: string;
  method: 'handShake';
  params: {
    methods: HandShakeDTO[];
  };
  id: string;
  timestamp: number;
}

export interface HandShakeDTO {
  key: string;
  value: { containerURL: string; value: string };
}
