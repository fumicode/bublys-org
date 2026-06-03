/**
 * 世界線アドレスの URL キー。どの universe も「自分の世界線の現在ノード」を
 * `wl=<node>` という形で表す（root はブラウザの `#wl=`、ネストは親バブルの
 * url `universe?wl=<node>`）。両者で同じキーを使うので 1 か所で定義する。
 */
export const WL_URL_KEY = "wl";
