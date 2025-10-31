import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Message,
  DTOParams,
  ExportDataMessage,
  OnChangeValueMessage,
  HandShakeMessage,
  HandShakeDTO,
} from './Messages.domain';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';
import { RootState } from './store/store';
import { AppData } from './store/appSlice';

function getDomainWithProtocol(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

//OSからバブリに送信するデータと、OSが参照しているデータを参照しているバブリのデータ
interface AssociateUpdateDataPairs {
  fromDTO: DTOParams; //OSが参照しているデータ
  toDTOs: DTOParams[]; //OSが参照しているデータを参照しているデータ
}

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

interface PostMessageManagerProps {
  iframeRefs: HTMLIFrameElement[];
}

export const PostMessageManager = ({ iframeRefs }: PostMessageManagerProps) => {
  const [handShakeData, setHandShakeData] = useState<HandShakeDTO[]>([]);
  const [associateData, setAssociateData] = useState<
    AssociateUpdateDataPairs[]
  >([]);

  //前回のactiveAppIdsを保存する
  const prevActiveRef = useRef<string[]>([]);
  useEffect(() => {
    //前回のactiveAppIdsを保存する
    const prev = prevActiveRef.current;
    const current = activeAppIds;
    //前回のactiveAppIdsと現在のactiveAppIdsを比較して、追加されたappIdを検出する
    const newlyActivated = current.filter((id) => !prev.includes(id));
    //追加されたAppDataを検出する
    newlyActivated.forEach((appId) => {
      const app: AppData | undefined = apps.find((a) => a.id === appId);
      if (!app) return;

      const message = handShakeMessage();
      sendMessageToIframe(appId, message);
      const send = () => {
        const iframe = iframeRefsMap.current.get(appId);
        if (iframe?.contentWindow) {
          try {
            iframe.contentWindow.postMessage(message, origin);
            // ここでログなど必要なら
          } catch (e) {
            console.error('postMessage 失敗', e);
          }
        } else {
          // 初回で window が無い場合の軽い再試行
          setTimeout(() => {
            const retry = iframeRefsMap.current.get(appId);
            if (retry?.contentWindow) {
              try {
                retry.contentWindow.postMessage(message, origin);
              } catch (e) {
                console.error('postMessage 再試行失敗', e);
              }
            }
          }, 150);
        }
      };

      send();
    });

    prevActiveRef.current = current;
  }, [activeAppIds, apps]);

  const sendMessageToIframe = useCallback((message: Message) => {
    const url = getDomainWithProtocol(message.params.containerURL);
    const iframe = iframeRefsMap.current.get(appId);
    if (iframe?.contentWindow) {
      console.log('📤 Sending message to iframe:', message);
      try {
        iframe.contentWindow.postMessage(message, '*');
      } catch (error) {
        console.error('Error sending message to iframe:', error);
      }
    } else {
      console.error('❌ Iframe contentWindow is not available for app:', appId);
      console.log(
        'Available iframes:',
        Array.from(iframeRefsMap.current.keys())
      );
    }
  }, []);
  const { apps, activeAppIds } = useSelector((state: RootState) => state.app);
  const activeAppUrls = useMemo(() => {
    return apps
      .filter((app) => activeAppIds.includes(app.id))
      .map((app) => {
        try {
          const u = new URL(app.url);
          return `${u.protocol}//${u.hostname}`;
        } catch {
          return null;
        }
      })
      .filter((u): u is string => !!u);
  }, [apps, activeAppIds]);

  const checkAndSetHandShakeData = (message: HandShakeMessage) => {
    setHandShakeData((prev) => {
      const index = prev.findIndex(
        (e) => e.key === message.params.methods[0].key
      );
      if (index !== -1) {
        const newData = [...prev];
        newData[index] = {
          ...newData[index],
          value: message.params.methods[0].value,
        };
        return newData;
      }
      return [
        ...prev,
        {
          key: message.params.methods[0].key,
          value: message.params.methods[0].value,
        },
      ];
    });
  };

  const checkAndSetExportData = (message: Message) => {
    setAssociateData((prev) => {
      const index = prev.findIndex(
        (e) => e.fromDTO.containerURL === message.params.containerURL
      );

      if (index !== -1) {
        const newData = [...prev];
        newData[index] = {
          ...newData[index],
          fromDTO: { ...newData[index].fromDTO, value: message.params.value },
        };
        return newData;
      }

      return [...prev, { fromDTO: message.params, toDTOs: [] }];
    });
  };

  const checkAndSetOnChangeValueData = (message: Message) => {
    setAssociateData((prev) => {
      const index = prev.findIndex(
        (e) => e.fromDTO.containerURL === message.params.containerURL
      );

      if (index === -1) return prev;

      const newData = [...prev];
      const updated = {
        ...newData[index],
        fromDTO: {
          ...newData[index].fromDTO,
          value: message.params.value,
        },
      };
      newData[index] = updated;
      updated.toDTOs.forEach((dto) => {
        const msg: Message = createMessage('exportData', dto);
        const domain = getDomainWithProtocol(dto.containerURL);

        if (!domain) return;

        if (activeAppUrls.includes(domain)) {
          sendMessageToIframe(dto.containerURL, msg);
        }
      });

      return newData;
    });
  };

  function isExportDataMessage(msg: Message): msg is ExportDataMessage {
    return (msg as ExportDataMessage).params !== undefined; // 判定条件を適宜
  }

  function isOnChangeValueMessage(msg: Message): msg is OnChangeValueMessage {
    return (msg as OnChangeValueMessage).params?.containerURL !== undefined;
  }

  function isHandShakeMessage(msg: Message): msg is HandShakeMessage {
    return (msg as HandShakeMessage).params !== undefined;
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
      } else if (isOnChangeValueMessage(message)) {
        checkAndSetOnChangeValueData(message);
      } else if (isHandShakeMessage(message)) {
        checkAndSetHandShakeData(message);
      } else {
        console.error('Error: サポートされていない形式です', message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return <div>ssss</div>;
};
