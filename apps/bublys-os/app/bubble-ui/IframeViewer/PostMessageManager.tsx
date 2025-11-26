import {
  useCallback,
  useEffect,
  createContext,
  useContext,
} from 'react';

import { v4 as uuidv4 } from 'uuid';

import {
  Message,
  ExportDataMessage,
  OnChangeValueMessage,
  HandShakeMessage,
  AppData,
  getDomainWithProtocol
} from "@bublys-org/state-management";

import { 
  RootState ,
  addHandShakeMessage, 
  addMessage ,
  addFromDTO, 
  addToDTOs ,
  addBublyContainer ,
  useAppDispatch, 
  useAppSelector 
} from "@bublys-org/state-management";

// PostMessageManager用のContext
const PostMessageContext = createContext<{
  sendMessageToIframeAutoFind: (
    message: Message,
    fromContainerURL?: string
  ) => void;
  registerIframeRef: (appId: string, iframe: HTMLIFrameElement) => void;
} | null>(null);

export const usePostMessage = () => {
  const context = useContext(PostMessageContext);
  if (!context) {
    throw new Error('usePostMessage must be used within PostMessageManager');
  }
  return context;
};

const createMessage = (method: string, params: any) => {
  return {
    protocol: 'http://localhost:3000/',
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

export interface AppDataAndRef {
  appData: AppData;
  ref: HTMLIFrameElement; //メッセージを送るためにiframeを参照するために使う
}

interface PostMessageManagerProps {
  appRefs: AppDataAndRef[];
  children: React.ReactNode;
  registerIframeRef: (appId: string, iframe: HTMLIFrameElement) => void;
}

export const PostMessageManager = ({
  appRefs,
  children,
  registerIframeRef,
}: PostMessageManagerProps) => {
  const associateUpdateDataPairs = useAppSelector(
    (state: RootState) => state.exportData.associateUpdateDataPairs
  );

  //uuidでAppRefを探す。
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // @ts-expect-error - 将来の実装のため保持
  const _findAppRefByUuid = useCallback(
    (uuid: string) => {
      return appRefs.find((e) => e.appData.id === uuid);
    },
    [appRefs]
  );

  //urlでAppRefを探す。
  const findAppRefByUrl = useCallback(
    (url: string) => {
      return appRefs.filter(
        (e) =>
          getDomainWithProtocol(e.appData.url) === getDomainWithProtocol(url)
      );
    },
    [appRefs]
  );

  // protocolからアプリを特定する
  const findAppRefByProtocol = useCallback(
    (protocol: string) => {
      console.log('🔍 findAppRefByProtocol called with:', protocol);
      console.log(
        '📋 Available appRefs:',
        appRefs.map((e) => ({ id: e.appData.id, url: e.appData.url }))
      );

      return appRefs.find((e) => {
        const appUrl = e.appData.url;
        const expectedPrefix = getDomainWithProtocol(appUrl);
        console.log(
          `  Checking ${e.appData.url}: does "${protocol}" start with "${expectedPrefix}"?`,
          protocol.startsWith(expectedPrefix || '')
        );
        return protocol.startsWith(expectedPrefix || '');
      });
    },
    [appRefs]
  );

  // アプリからのreadyメッセージを受け取った際にhandshakeを送信
  const sendHandshakeToApp = useCallback((appRef: AppDataAndRef) => {
    console.log('✅ Sending handshake to app:', appRef.appData.id);
    appRef.ref.contentWindow?.postMessage(handShakeMessage(), '*');
  }, []);

  const dispatch = useAppDispatch();

  const sendMessageToIframeAutoFind = useCallback(
    (message: Message, fromContainerURL?: string) => {
      console.log('sendMessageToIframeAutoFind', JSON.stringify(message));
      const url = getDomainWithProtocol(message.params.containerURL);
      if (!url) return;
      const iframes = findAppRefByUrl(url)?.map((e) => e.ref);
      console.log('iframes', appRefs);
      if (!iframes?.length) return;

      // exportDataメッセージで、fromContainerURLが指定されている場合、toDTOsを更新
      if (message.method === 'exportData' && fromContainerURL) {
        dispatch(
          addToDTOs({
            toDTO: message.params,
            fromContainerURL,
          })
        );
        console.log(
          '✅ Added toDTO:',
          message.params.containerURL,
          'from:',
          fromContainerURL
        );
      }

      iframes.forEach((iframe) => {
        if (!iframe.contentWindow) return;
        iframe.contentWindow.postMessage(message, '*');
      });
    },
    [findAppRefByUrl, dispatch]
  );
  const checkAndSetHandShakeData = useCallback(
    (message: HandShakeMessage) => {
      dispatch(addHandShakeMessage(message));
      if (message.params.resources) {
        dispatch(addBublyContainer(message));
      }
    },
    [dispatch]
  );

  const checkAndSetExportData = useCallback(
    (message: Message) => {
      // 既存のassociatePairを探す
      const associatePair = associateUpdateDataPairs.find(
        (e) => e.fromDTO.containerURL === message.params.containerURL
      );

      // fromDTOを更新
      dispatch(addFromDTO(message.params));

      // fromDTOが更新されたので、紐づくtoDTOsに対してexportDataを送信
      if (associatePair && associatePair.toDTOs.length > 0) {
        console.log(`📤 Sending exportData to ${associatePair.toDTOs.length} toDTOs for fromDTO:`, message.params.containerURL);

        associatePair.toDTOs.forEach((toDTO) => {
          const exportDataMsg: Message = createMessage('exportData', {
            containerURL: toDTO.containerURL,
            value: message.params.value, // fromDTOの最新のvalue
          });

          sendMessageToIframeAutoFind(exportDataMsg);
        });
      }
    },
    [dispatch, associateUpdateDataPairs, sendMessageToIframeAutoFind]
  );

  //バブリからonChangeValueを受信した時、OSの参照しているデータを更新し、
  // AssociateUpdateDataPairsに設定されているtoDTOsを参照して、
  // OSから対象のバブリにexportDataを送信する
  const checkAndSetOnChangeValueData = useCallback(
    (message: Message) => {
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
      console.log(`📤 Sending exportData to ${associateData.toDTOs.length} toDTOs for fromDTO:`, message.params.containerURL);

      associateData.toDTOs.forEach((toDTO) => {
        const msg: Message = createMessage('exportData', {
          containerURL: toDTO.containerURL,
          value: message.params.value, // fromDTOの最新のvalue
        });
        sendMessageToIframeAutoFind(msg);
      });
    },
    [associateUpdateDataPairs, dispatch, sendMessageToIframeAutoFind]
  );

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

      // readyメッセージを受け取ったらhandshakeを送信
      if (message.method === 'ready') {
        console.log('📩 Received ready message from app:', message.protocol);
        const appRef = findAppRefByProtocol(message.protocol);
        if (appRef) {
          sendHandshakeToApp(appRef);
        } else {
          console.log('❌ App not found for protocol:', message.protocol);
        }
        return;
      }

      dispatch(addMessage(message));
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
  }, [
    findAppRefByProtocol,
    sendHandshakeToApp,
    dispatch,
    checkAndSetExportData,
    checkAndSetOnChangeValueData,
    checkAndSetHandShakeData,
  ]);

  return (
    <PostMessageContext.Provider
      value={{ sendMessageToIframeAutoFind, registerIframeRef }}
    >
      {children}
    </PostMessageContext.Provider>
  );
};

export default PostMessageManager;
