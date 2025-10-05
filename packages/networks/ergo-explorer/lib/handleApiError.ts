import {
  FailedError,
  NetworkError,
  UnexpectedApiError,
} from '@rosen-chains/abstract-chain';

interface ErrorHandler<HandlerReturnType> {
  (error: any): HandlerReturnType;
}

/**
 * handle an axios api error, considering different kinds of events which may
 * cause it
 * @param error the error object
 * @param baseMessage string to prepend the actual error message
 * @param overrideHandlers an object for overriding how different kinds of error
 * are handled
 */
const handleApiError = <
  RespondedStateHandlerReturnType = never,
  NotRespondedStateHandlerReturnType = never,
  UnknownStateHandlerReturnType = never,
>(
  error: any,
  baseMessage: string,
  overrideHandlers?: {
    handleRespondedState?: ErrorHandler<RespondedStateHandlerReturnType>;
    handleNotRespondedState?: ErrorHandler<NotRespondedStateHandlerReturnType>;
    handleUnknownState?: ErrorHandler<UnknownStateHandlerReturnType>;
  },
):
  | RespondedStateHandlerReturnType
  | NotRespondedStateHandlerReturnType
  | UnknownStateHandlerReturnType => {
  const generateErrorMessage = (partialMessage: string) =>
    `${baseMessage} ${partialMessage}`;

  const handleRespondedState =
    overrideHandlers?.handleRespondedState ??
    ((error: any) => {
      throw new FailedError(generateErrorMessage(error.response.data.reason));
    });
  const handleNotRespondedState =
    overrideHandlers?.handleNotRespondedState ??
    ((error: any) => {
      throw new NetworkError(generateErrorMessage(error.message));
    });
  const handleUnknownState =
    overrideHandlers?.handleUnknownState ??
    ((error: any) => {
      throw new UnexpectedApiError(generateErrorMessage(error.message));
    });

  if (error.response) {
    return handleRespondedState(error);
  } else if (error.request) {
    return handleNotRespondedState(error);
  } else {
    return handleUnknownState(error);
  }
};

export default handleApiError;
