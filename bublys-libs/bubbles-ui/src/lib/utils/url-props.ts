/**
 * data-url属性を付与するためのユーティリティ関数
 * リンクバブルを表示する際に同じURLの場所を特定するために使用
 */
export const urlProps = (url: string) => ({ 'data-url': url });
