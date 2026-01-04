import { DataSource } from '@rosen-bridge/extended-typeorm';

import PublicStatusHandler, {
  UpdateStatusDTO,
} from '../../src/handlers/publicStatusHandler';

class TestPublicStatusHandler extends PublicStatusHandler {
  constructor(dataSource: DataSource) {
    super(dataSource);
  }

  callDTOToSignMessage = (dto: UpdateStatusDTO) => this.dtoToSignMessage(dto);

  callSubmitRequest = (dto: UpdateStatusDTO) => this.submitRequest(dto);
}

export default TestPublicStatusHandler;
