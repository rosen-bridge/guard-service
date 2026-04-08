import { DataSource } from '@rosen-bridge/extended-typeorm';

import PublicStatusHandler, {
  UpdateStatusDTO,
} from '../../src/handlers/publicStatusHandler';

class TestPublicStatusHandler extends PublicStatusHandler {
  constructor(dataSource: DataSource) {
    super(dataSource, ' ');
  }

  callDTOToSignMessage = (dto: UpdateStatusDTO, date: number) =>
    this.dtoToSignMessage(dto, date);

  callSubmitRequest = (dto: UpdateStatusDTO) => this.submitRequest(dto);
}

export default TestPublicStatusHandler;
