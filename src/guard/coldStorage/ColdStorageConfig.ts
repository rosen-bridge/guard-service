import config from 'config';

class ColdStorageConfig {
  static start = config.get<number>('coldStorage.startHour'); // hour (0-23)
  static end = config.get<number>('coldStorage.endHour'); // hour (0-23)

  /**
   * checks if now is withing start and end hour of cold storage process time
   */
  static isWithinTime = (): boolean => {
    const startingTimeStamp = Math.round(Date.now() / 1000);
    const startInSeconds = this.start * 60 * 60;
    const endInSeconds = this.end * 60 * 60;

    const currentTimeOfDayInSeconds = startingTimeStamp % (24 * 60 * 60); // time reminder in day seconds
    return (
      currentTimeOfDayInSeconds >= startInSeconds &&
      currentTimeOfDayInSeconds <= endInSeconds
    );
  };
}

export default ColdStorageConfig;
