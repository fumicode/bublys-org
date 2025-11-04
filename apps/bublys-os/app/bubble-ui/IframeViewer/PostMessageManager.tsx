import { useCallback, useEffect, useRef } from 'react';
import {
  Message,
  ExportDataMessage,
  OnChangeValueMessage,
  HandShakeMessage,
} from './Messages.domain';
import { v4 as uuidv4 } from 'uuid';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/store';
import { addHandShakeMessage } from './store/massageSlice';
import { addFromDTO, addToDTOs } from './store/exportData.Slice';
import { AppData } from './store/appSlice';
import getDomainWithProtocol from './GetDomainWithProtocol';

const createMessage = (method: string, params: any) => {
  return {
    protocol: 'http://localhost:3000',
    version: '0.0.1',
    method: method,
    params: params,
    id: uuidv4(),
    timestamp: Date.now(),
  };
};

//自分の読めるメソッドを相手に渡す
const handShakeMessage = () => {
  return createMessage('handShake', {
    methods: [
      {
        key: 'exportData',
        value: { containerURL: 'string', value: 'number' },
      },
      {
        key: 'onChangeValue',
        value: { containerURL: 'string', value: 'number' },
      },
    ],
  });
};

export interface AppDataAndRefs {
  appData: AppData;
  ref: HTMLIFrameElement; //メッセージを送るためにiframeを参照するために使う
}

interface PostMessageManagerProps {
  appRefs: AppDataAndRefs[];
  child: React.ReactNode;
}

export const PostMessageManager = ({
  appRefs,
  child,
}: PostMessageManagerProps) => {
  //reduxのactiveAppIdsを参照する
  const activeAppIds = useSelector(
    (state: RootState) => state.app.activeAppIds
  );
  const associateUpdateDataPairs = useSelector(
    (state: RootState) => state.exportData.associateUpdateDataPairs
  );
  const prevActiveAppIds = useRef<string[]>([]);

  //uuidでAppRefを探す。
  const findAppRefByUuid = useCallback((uuid: string) => {
    return appRefs.find((e) => e.appData.uuid === uuid);
  }, [appRefs]);

  //urlでAppRefを探す。
  const findAppRefByUrl = useCallback((url: string) => {
    return appRefs.filter((e) => e.appData.url === url);
  }, [appRefs]);

  // activeAppIdsの変更を検知してhandShakeを送信
  // appRefsも依存配列に含めることで、refが利用可能になった時点で送信できる
  useEffect(() => {
    const prev = prevActiveAppIds.current;
    const current = activeAppIds;

    // 前回のactiveAppIdsと現在のactiveAppIdsを比較して、追加されたappIdを検出する
    const newlyActivatedAppUUID = current.find((id) => !prev.includes(id));
    console.log('🔍 [activeAppIds or appRefs changed] newlyActivatedAppUUID:', newlyActivatedAppUUID);
    console.log('🔍 Available appRefs:', appRefs.map(a => ({ uuid: a.appData.uuid, hasRef: !!a.ref })));

    if (!newlyActivatedAppUUID) {
      // 新しく追加されたappがない場合でも、appRefsの更新で送信可能になる場合がある
      // activeAppIds全てに対してチェック
      const needsHandShake = current.find((id) => {
        const appRef = findAppRefByUuid(id);
        return appRef && !prevActiveAppIds.current.includes(id);
      });

      if (needsHandShake) {
        const appRef = findAppRefByUuid(needsHandShake);
        if (appRef) {
          console.log('✅ [Delayed] appRef found, sending handShake to:', needsHandShake);
          appRef.ref.contentWindow?.postMessage(handShakeMessage(), '*');
          prevActiveAppIds.current = activeAppIds;
        }
      }
      return;
    }

    const appRef = findAppRefByUuid(newlyActivatedAppUUID);
    if (!appRef) {
      console.log('❌ appRef not found for:', newlyActivatedAppUUID, '- waiting for appRefs update');
      return;
    }

    console.log('✅ appRef found, sending handShake to:', newlyActivatedAppUUID);
    appRef.ref.contentWindow?.postMessage(handShakeMessage(), '*');

    // 現在のactiveAppIdsを保存
    prevActiveAppIds.current = activeAppIds;
  }, [activeAppIds, appRefs, findAppRefByUuid]);

  const sendMessageToIframeAutoFind = useCallback((message: Message) => {
    const url = getDomainWithProtocol(message.params.containerURL);
    if (!url) return;
    const iframes = findAppRefByUrl(url)?.map((e) => e.ref);
    if (!iframes?.length) return;
    iframes.forEach((iframe) => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage(message, '*');
    });
  }, []);

  const dispatch = useDispatch();
  const checkAndSetHandShakeData = (message: HandShakeMessage) => {
    dispatch(addHandShakeMessage(message));
  };

  const checkAndSetExportData = (message: Message) => {
    dispatch(addFromDTO(message.params));
  };

  //バブリからonChangeValueを受信した時、OSの参照しているデータを更新し、
  // AssociateUpdateDataPairsに設定されているtoDTOsを参照して、
  // OSから対象のバブリにexportDataを送信する
  const checkAndSetOnChangeValueData = (message: Message) => {
    //保存されているデータがあるか確認。
    const associateData = associateUpdateDataPairs.find(
      (e) => e.fromDTO.containerURL === message.params.containerURL
    );
    //なければ何もしない。
    if (!associateData) return;
    //保存されているデータを更新する。
    dispatch(
      addFromDTO({
        containerURL: message.params.containerURL,
        value: message.params.value,
      })
    );
    //AssociateUpdateDataPairsに設定されているtoDTOsを参照して、
    //OSから対象のバブリにexportDataを送信する。
    associateData.toDTOs.forEach((dto) => {
      const msg: Message = createMessage('exportData', dto);
      sendMessageToIframeAutoFind(msg);
    });
  };

  function isExportDataMessage(msg: Message): msg is ExportDataMessage {
    return (
      (msg as ExportDataMessage).params !== undefined &&
      (msg as ExportDataMessage).method === 'exportData'
    );
  }

  function isOnChangeValueMessage(msg: Message): msg is OnChangeValueMessage {
    return (
      (msg as OnChangeValueMessage).params?.containerURL !== undefined &&
      (msg as OnChangeValueMessage).method === 'onChangeValue'
    );
  }

  function isHandShakeMessage(msg: Message): msg is HandShakeMessage {
    return (
      (msg as HandShakeMessage).params !== undefined &&
      (msg as HandShakeMessage).method === 'handShake'
    );
  }

  // 子ウィンドウからのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      // React DevToolsや自分からのメッセージを除外
      if (
        typeof data?.source === 'string' &&
        (data.source.includes('react-devtools') ||
          data.source.includes('devtools'))
      )
        return;
      if (event.source === window) return;

      console.log(JSON.stringify(data));

      const message = data as Message;

      if (isExportDataMessage(message)) {
        checkAndSetExportData(message);
        console.log('exportDataを受け取った');
      } else if (isOnChangeValueMessage(message)) {
        checkAndSetOnChangeValueData(message);
        console.log('onChangeValueを受け取った');
      } else if (isHandShakeMessage(message)) {
        checkAndSetHandShakeData(message);
        console.log('handShakeを受け取った');
      } else {
        console.error('Error: サポートされていない形式です', message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return child;
};

export default PostMessageManager;
