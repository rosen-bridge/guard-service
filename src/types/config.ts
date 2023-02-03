interface BaseLogConfig<T> {
  type: T;
  level: string;
}

export interface FileLogConfig extends BaseLogConfig<'file'> {
  path: string;
  maxSize: string;
  maxFiles: string;
  level: string;
}

export type ConsoleLogConfig = BaseLogConfig<'console'>;

export type LogConfig = FileLogConfig | ConsoleLogConfig;
