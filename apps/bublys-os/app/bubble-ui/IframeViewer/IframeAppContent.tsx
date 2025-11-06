import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Select,
  MenuItem,
} from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { usePostMessage } from './PostMessageManager';

import type {
  BublyMethods,
  ImportableContainer,
} from '@bublys-org/state-management';

import { 
  selectAppById, 
  RootState ,
  selectBublysContainersByBublyUrl ,
  selectChildHandShakeMessage,
  selectReceivedMessagesByAppUrl,
  selectFromDTO ,
  useAppSelector
 } from '@bublys-org/state-management';

interface IframeAppContentProps {
  appId: string;
}

export const IframeAppContent = ({ appId }: IframeAppContentProps) => {
  const { sendMessageToIframeAutoFind, registerIframeRef } = usePostMessage();

  const application = useAppSelector( selectAppById( appId));

  const receivedMessages = useAppSelector((state: RootState) =>
    application
      ? selectReceivedMessagesByAppUrl(state.massage, application.url)
      : []
  );

  const exportData = useAppSelector((state: RootState) =>
    application ? selectFromDTO(state.exportData) : []
  );

  const childHandShakeMessage = useAppSelector((state: RootState) =>
    application
      ? selectChildHandShakeMessage(state.massage, application.url)
      : null
  );

  const bublyContainers = useAppSelector((state: RootState) =>
    application
      ? selectBublysContainersByBublyUrl(
          state.bublysContainers,
          application.url
        )
      : null
  );

  const [inputURLText, setInputURLText] = useState('');
  const [isClient, setIsClient] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState<BublyMethods | null>(
    null
  );

  const selectMethod = (method: string) => {
    const childMethod = childMethods?.find((e) => e.key === method);
    if (!childMethod) {
      console.log('Method not found');
      return;
    }
    setSelectedMethod(childMethod);
  };

  const [selectedImportableContainer, setSelectedImportableContainer] =
    useState<ImportableContainer | null>(null);

  const selectImportableContainer = (selectedContainerUrl: string) => {
    const importableContainer = bublyContainers?.importableContainers?.find(
      (e) => e.containerUrl === selectedContainerUrl
    );
    if (!importableContainer) {
      console.log('Method not found');
      setSelectedImportableContainer(null);
      return;
    }
    setSelectedImportableContainer(importableContainer);
  };
  const [selectedContainerURL, setSelectedContainerURL] = useState<string>('');
  const childMethods = childHandShakeMessage?.params
    .methods as unknown as BublyMethods[];

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const myIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (myIframeRef.current) {
      registerIframeRef(appId, myIframeRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  if (!application) return null;
  return (
    <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
      <TextField
        fullWidth
        value={inputURLText}
        onChange={(e) => setInputURLText(e.target.value)}
        placeholder="URLを入力"
        sx={{ mb: 2 }}
      />

      {application && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 100px)',
            flex: 1,
            gap: 2,
          }}
        >
          <Box
            sx={{
              flex: 1,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <iframe
              key={application?.id}
              ref={myIframeRef}
              src={application?.url}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
              title={application?.name}
            />
          </Box>

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              bgcolor: 'background.paper',
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              POST MESSAGE
            </Typography>

            {/* PAYLOAD */}
            <Box
              sx={{
                mb: 2,
                maxHeight: '500px',
                overflowY: 'scroll',
              }}
            >
              <div>
                <h3>受信したメッセージ履歴</h3>
                {receivedMessages.length > 0 ? (
                  <div
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      margin: '10px 0',
                      padding: '12px',
                      backgroundColor: '#f9f9f9',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingBottom: '4px',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <span>
                        <strong>method:</strong>{' '}
                        {receivedMessages[receivedMessages.length - 1].method}
                      </span>
                      {isClient && (
                        <span
                          style={{
                            color: '#555',
                            fontSize: '0.9em',
                          }}
                        >
                          {new Date(
                            receivedMessages[
                              receivedMessages.length - 1
                            ].timestamp
                          ).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(
                        receivedMessages[receivedMessages.length - 1],
                        null,
                        2
                      )}
                    </div>
                  </div>
                ) : (
                  <p>メッセージ履歴がありません</p>
                )}
              </div>
              <Box
                sx={{ pl: 2, borderLeft: 2, borderColor: 'primary.main' }}
              ></Box>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              <Select
                value={selectedMethod?.key ?? ''}
                onChange={(e) => selectMethod(e.target.value as string)}
              >
                <MenuItem value={''}>Unselected</MenuItem>
                {childMethods?.map((e, index) => (
                  <MenuItem key={index} value={e.key}>
                    {e.key}
                  </MenuItem>
                ))}
              </Select>
              <Select
                value={selectedImportableContainer?.containerUrl ?? ''}
                onChange={(e) => selectImportableContainer(e.target.value)}
              >
                <MenuItem value={''}>Unselected</MenuItem>
                {bublyContainers?.importableContainers?.map((e, index) => (
                  <MenuItem key={index} value={e.containerUrl}>
                    {e.containerName}
                  </MenuItem>
                ))}
              </Select>
              <Select
                value={selectedContainerURL ?? ''}
                onChange={(event) =>
                  setSelectedContainerURL(event.target.value as string)
                }
              >
                <MenuItem value={''}>Unselected</MenuItem>
                {exportData.map((e, index) => (
                  <MenuItem key={index} value={e.containerURL}>
                    {e.containerURL}: {JSON.stringify(e.value)}
                  </MenuItem>
                ))}
              </Select>
              <Button
                variant="outlined"
                onClick={() => {
                  if (selectedMethod && selectedImportableContainer) {
                    const current = exportData.find(
                      (e) => e.containerURL === selectedContainerURL
                    );
                    if (current) {
                      sendMessageToIframeAutoFind(
                        createMessage(selectedMethod.key, {
                          containerURL:
                            selectedImportableContainer.containerUrl,
                          value: current.value,
                        }),
                        current.containerURL // fromContainerURL (valueの出どころ)
                      );
                    }
                  } else if (selectedMethod) {
                    const current = exportData.find(
                      (e) => e.containerURL === selectedContainerURL
                    );
                    if (current) {
                      sendMessageToIframeAutoFind(
                        createMessage(selectedMethod.key, {
                          containerURL: current.containerURL,
                        })
                      );
                    }
                  }
                }}
              >
                送信
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default IframeAppContent;
