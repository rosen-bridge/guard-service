interface BaseLogConfig {
  level: string;
}

export interface RotateFileLogConfig extends BaseLogConfig {
  path: string;
  maxSize: string;
  maxFiles: string;
  level: string;
}

export type ConsoleLogConfig = BaseLogConfig;
