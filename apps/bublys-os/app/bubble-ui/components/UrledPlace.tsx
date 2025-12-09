import { FC } from "react";
import { urlProps } from "../utils/url-props";

type UrledPlaceProps = {
  url: string;
  children?: React.ReactNode;
};

/**
 * data-url属性を持つラッパーコンポーネント
 * リンクバブルを表示する際に同じURLの場所を特定するために使用
 * display: contents により、余計なDOMノードを挿入しない
 */
export const UrledPlace: FC<UrledPlaceProps> = ({ url, children }) => {
  return (
    <span {...urlProps(url)} style={{ display: 'contents' }}>
      {children}
    </span>
  );
};
