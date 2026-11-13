export type Language = 'ko' | 'en' | 'ru'

export type Dictionary = {
  title: string
  step1: string
  step2: string
  step3: string
  sectionUpload: string
  sectionDocuments: string
  sectionPresentationDate: string
  sectionCheck: string
  createSet: string
  upload: string
  currentSet: string
  noDocuments: string
  showValues: string
  hideValues: string
  noValues: string
  presentationDateLabel: string
  presentationDateHelper: string
  savePresentationDate: string
  runCheck: string
  downloadReport: string
  dropHint: string
  dropSub: string
  valueLc: string
  valueDoc: string
  summary: (passed: number, failed: number, skipped: number) => string
  summaryPassed: (count: number) => string
  summaryFailed: (count: number) => string
  summarySkipped: (count: number) => string
  docTypes: Record<string, string>
  ruleNames: Record<number, string>
  verdicts: Record<string, string>
  aiNotePrefix: string
  comparison: {
    leftHeader: string
    rightHeader: string
    lcLatestShipmentDate: string
    blShippedOnBoardDate: string
    lcPresentationDays: string
    daysToPresent: string
    lcExpiryDate: string
    presentationDate: string
    shipmentDate: string
    insuranceIssueDate: string
    lcAmount: string
    invoiceAmount: string
    packingGrossWeight: string
    blGrossWeight: string
    invoiceQuantity: string
    packingQuantity: string
    packingCartons: string
    blCartons: string
    lcGoodsDescription: string
    invoiceGoodsDescription: string
    lcPorts: string
    blPorts: string
    lcApplicant: string
    blConsignee: string
    blNotifyParty: string
    requiredDocuments: string
    missingDocuments: string
    requiredNotation: string
    blNotation: string
    loading: string
    discharge: string
    limit: string
    daysUnit: string
    onBoardPresent: string
    onBoardAbsent: string
  }
  results: {
    failedHeading: (count: number) => string
    skippedHeading: (count: number) => string
    passedHeading: (count: number) => string
    noFailed: string
    noSkipped: string
    noPassed: string
    badgeFailed: string
    badgeSkipped: string
    badgePassed: string
    showPassed: string
    hidePassed: string
    noReason: string
    unknownRule: (ruleNo: number) => string
  }
  messages: {
    newSet: string
    uploaded: string
    dateSaved: string
    reportDownloaded: string
  }
  errors: {
    createSet: string
    noSet: string
    noFile: string
    upload: string
    dateRequired: string
    dateSave: string
    check: string
    report: string
  }
}

export type ErrorKey = keyof Dictionary['errors']
export type MessageKey = keyof Dictionary['messages']

export const LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
]

export const LANGUAGE_STORAGE_KEY = 'lc-checker-language'

export const dictionaries: Record<Language, Dictionary> = {
  ko: {
    title: '신용장 서류 대조',
    step1: '1단계',
    step2: '2단계',
    step3: '3단계',
    sectionUpload: '서류 올리기',
    sectionDocuments: '올린 서류 목록',
    sectionPresentationDate: '제시일 입력',
    sectionCheck: '검사 실행',
    createSet: '새 세트 만들기',
    upload: '올리기',
    currentSet: '현재 세트:',
    noDocuments: '업로드된 파일이 없습니다.',
    showValues: '뽑은 값 보기',
    hideValues: '뽑은 값 숨기기',
    noValues: '뽑은 값이 없습니다.',
    presentationDateLabel: '은행에 서류를 내는 날짜',
    presentationDateHelper: '이 날짜가 있어야 제시 기한 검사가 돌아갑니다.',
    savePresentationDate: '제시일 저장',
    runCheck: '검사 실행',
    downloadReport: '보고서 받기',
    dropHint: '파일을 여기로 끌어다 놓거나 눌러서 선택하세요',
    dropSub: 'PDF와 텍스트 파일만 됩니다',
    valueLc: '신용장 값',
    valueDoc: '서류 값',
    summary: (passed, failed, skipped) =>
      `검사 완료 — 통과 ${passed}개 · 불일치 ${failed}개 · 검사 못함 ${skipped}개`,
    summaryPassed: (count) => `통과 ${count}개`,
    summaryFailed: (count) => `불일치 ${count}개`,
    summarySkipped: (count) => `검사 못함 ${count}개`,
    docTypes: {
      LC: '신용장',
      INVOICE: '상업송장',
      PACKING_LIST: '포장명세서',
      BILL_OF_LADING: '선하증권',
      INSURANCE: '보험증서',
      unknown: '종류 미확인',
    },
    ruleNames: {
      1: '선적 마감일',
      2: '제시 기한 (21일)',
      3: '신용장 만료일',
      4: '보험 날짜',
      5: '송장 금액 한도',
      6: '총중량 일치',
      7: '수량 일치',
      8: '상자 수 일치',
      9: '물품 설명 대응',
      10: '항구 일치',
      11: '수하인 일치',
      12: '통지처 일치',
      13: '요구 서류 구비',
      14: '본선적재 표기',
      15: '배서 (이번 버전 검사 제외)',
    },
    verdicts: {
      corresponds: '같은 물품으로 보임',
      discrepancy: '실제로 다름',
      likely_typo: '오타로 보임',
      different: '다른 회사로 보임',
      unsure: '판단 보류',
    },
    aiNotePrefix: 'AI 참고 의견:',
    comparison: {
      leftHeader: '신용장·기준 값',
      rightHeader: '서류 값',
      lcLatestShipmentDate: '신용장 선적 마감일',
      blShippedOnBoardDate: '선하증권 본선적재일',
      lcPresentationDays: '신용장 제시 기한',
      daysToPresent: '제시까지 걸린 날',
      lcExpiryDate: '신용장 만료일',
      presentationDate: '제시일',
      shipmentDate: '선적일',
      insuranceIssueDate: '보험 발행일',
      lcAmount: '신용장 금액',
      invoiceAmount: '송장 금액',
      packingGrossWeight: '포장명세서 총중량',
      blGrossWeight: '선하증권 총중량',
      invoiceQuantity: '송장 수량',
      packingQuantity: '포장명세서 수량',
      packingCartons: '포장명세서 상자 수',
      blCartons: '선하증권 상자 수',
      lcGoodsDescription: '신용장 물품 설명',
      invoiceGoodsDescription: '송장 물품 설명',
      lcPorts: '신용장 항구',
      blPorts: '선하증권 항구',
      lcApplicant: '신용장 신청인',
      blConsignee: '선하증권 수하인',
      blNotifyParty: '선하증권 통지처',
      requiredDocuments: '신용장 요구 서류',
      missingDocuments: '빠진 서류',
      requiredNotation: '필요한 표기',
      blNotation: '선하증권 표기',
      loading: '선적',
      discharge: '하적',
      limit: '한도',
      daysUnit: '일',
      onBoardPresent: '본선적재 표기 있음',
      onBoardAbsent: '표기 없음',
    },
    results: {
      failedHeading: (count) => `불일치 ${count}개`,
      skippedHeading: (count) => `검사 못함 ${count}개`,
      passedHeading: (count) => `통과 ${count}개`,
      noFailed: '불일치가 없습니다.',
      noSkipped: '검사 못한 항목이 없습니다.',
      noPassed: '통과한 검사가 없습니다.',
      badgeFailed: '불일치',
      badgeSkipped: '검사 못함',
      badgePassed: '통과',
      showPassed: '통과한 검사 보기',
      hidePassed: '통과한 검사 숨기기',
      noReason: '이유 없음',
      unknownRule: (ruleNo) => `검사 ${ruleNo}`,
    },
    messages: {
      newSet: '새 세트가 만들어졌습니다.',
      uploaded: '파일이 업로드되었습니다.',
      dateSaved: '제시일을 저장했습니다.',
      reportDownloaded: '보고서를 내려받았습니다.',
    },
    errors: {
      createSet: '세트를 만들지 못했습니다.',
      noSet: '먼저 새 세트를 만들어 주세요.',
      noFile: '업로드할 파일을 선택해 주세요.',
      upload: '업로드에 실패했습니다.',
      dateRequired: '은행에 서류를 내는 날짜를 선택해 주세요.',
      dateSave:
        '제시일 저장에 실패했습니다. 서버가 켜져 있는지 확인해 주세요.',
      check: '검사에 실패했습니다. 서버가 켜져 있는지 확인해 주세요.',
      report: '보고서를 받지 못했습니다. 검사를 먼저 실행해 주세요.',
    },
  },
  en: {
    title: 'LC Document Check',
    step1: 'Step 1',
    step2: 'Step 2',
    step3: 'Step 3',
    sectionUpload: 'Upload documents',
    sectionDocuments: 'Uploaded documents',
    sectionPresentationDate: 'Presentation date',
    sectionCheck: 'Run check',
    createSet: 'Create new set',
    upload: 'Upload',
    currentSet: 'Current set:',
    noDocuments: 'No files uploaded.',
    showValues: 'Show extracted values',
    hideValues: 'Hide extracted values',
    noValues: 'No extracted values.',
    presentationDateLabel: 'Date you present documents to the bank',
    presentationDateHelper:
      'This date is required for the presentation-period check.',
    savePresentationDate: 'Save presentation date',
    runCheck: 'Run check',
    downloadReport: 'Download report',
    dropHint: 'Drag files here, or click to choose',
    dropSub: 'PDF and text files only',
    valueLc: 'Letter of credit',
    valueDoc: 'Document',
    summary: (passed, failed, skipped) =>
      `Check complete — Passed ${passed} · Discrepancies ${failed} · Skipped ${skipped}`,
    summaryPassed: (count) => `Passed ${count}`,
    summaryFailed: (count) => `Discrepancies ${count}`,
    summarySkipped: (count) => `Skipped ${count}`,
    docTypes: {
      LC: 'Letter of credit',
      INVOICE: 'Commercial invoice',
      PACKING_LIST: 'Packing list',
      BILL_OF_LADING: 'Bill of lading',
      INSURANCE: 'Insurance certificate',
      unknown: 'Unknown type',
    },
    ruleNames: {
      1: 'Latest shipment date',
      2: 'Presentation period (21 days)',
      3: 'LC expiry date',
      4: 'Insurance date',
      5: 'Invoice amount limit',
      6: 'Gross weight match',
      7: 'Quantity match',
      8: 'Carton count match',
      9: 'Goods description correspondence',
      10: 'Port match',
      11: 'Consignee match',
      12: 'Notify party match',
      13: 'Required documents present',
      14: 'On-board notation',
      15: 'Endorsement (not checked in this version)',
    },
    verdicts: {
      corresponds: 'Looks like the same goods',
      discrepancy: 'Actually different',
      likely_typo: 'Looks like a typo',
      different: 'Looks like a different company',
      unsure: 'Unclear',
    },
    aiNotePrefix: 'AI note:',
    comparison: {
      leftHeader: 'LC / reference value',
      rightHeader: 'Document value',
      lcLatestShipmentDate: 'LC latest shipment date',
      blShippedOnBoardDate: 'B/L on-board date',
      lcPresentationDays: 'LC presentation period',
      daysToPresent: 'Days taken to present',
      lcExpiryDate: 'LC expiry date',
      presentationDate: 'Presentation date',
      shipmentDate: 'Shipment date',
      insuranceIssueDate: 'Insurance issue date',
      lcAmount: 'LC amount',
      invoiceAmount: 'Invoice amount',
      packingGrossWeight: 'Packing list gross weight',
      blGrossWeight: 'B/L gross weight',
      invoiceQuantity: 'Invoice quantity',
      packingQuantity: 'Packing list quantity',
      packingCartons: 'Packing list cartons',
      blCartons: 'B/L cartons',
      lcGoodsDescription: 'LC goods description',
      invoiceGoodsDescription: 'Invoice goods description',
      lcPorts: 'LC ports',
      blPorts: 'B/L ports',
      lcApplicant: 'LC applicant',
      blConsignee: 'B/L consignee',
      blNotifyParty: 'B/L notify party',
      requiredDocuments: 'Required LC documents',
      missingDocuments: 'Missing documents',
      requiredNotation: 'Required notation',
      blNotation: 'B/L notation',
      loading: 'Loading',
      discharge: 'Discharge',
      limit: 'limit',
      daysUnit: ' days',
      onBoardPresent: 'On-board notation present',
      onBoardAbsent: 'No notation',
    },
    results: {
      failedHeading: (count) => `Discrepancies: ${count}`,
      skippedHeading: (count) => `Skipped: ${count}`,
      passedHeading: (count) => `Passed: ${count}`,
      noFailed: 'No discrepancies.',
      noSkipped: 'No skipped checks.',
      noPassed: 'No passed checks.',
      badgeFailed: 'Discrepancy',
      badgeSkipped: 'Skipped',
      badgePassed: 'Passed',
      showPassed: 'Show passed checks',
      hidePassed: 'Hide passed checks',
      noReason: 'No reason given',
      unknownRule: (ruleNo) => `Check ${ruleNo}`,
    },
    messages: {
      newSet: 'A new set was created.',
      uploaded: 'File uploaded.',
      dateSaved: 'Presentation date saved.',
      reportDownloaded: 'Report downloaded.',
    },
    errors: {
      createSet: 'Could not create a set.',
      noSet: 'Create a new set first.',
      noFile: 'Choose a file to upload.',
      upload: 'Upload failed.',
      dateRequired: 'Choose the date you present the documents to the bank.',
      dateSave:
        'Could not save the presentation date. Check that the server is running.',
      check: 'Check failed. Check that the server is running.',
      report: 'Could not download the report. Run the check first.',
    },
  },
  ru: {
    title: 'Проверка документов по аккредитиву',
    step1: 'Шаг 1',
    step2: 'Шаг 2',
    step3: 'Шаг 3',
    sectionUpload: 'Загрузка документов',
    sectionDocuments: 'Загруженные документы',
    sectionPresentationDate: 'Дата представления',
    sectionCheck: 'Запуск проверки',
    createSet: 'Создать новый набор',
    upload: 'Загрузить',
    currentSet: 'Текущий набор:',
    noDocuments: 'Файлы не загружены.',
    showValues: 'Показать извлечённые значения',
    hideValues: 'Скрыть извлечённые значения',
    noValues: 'Извлечённых значений нет.',
    presentationDateLabel: 'Дата представления документов в банк',
    presentationDateHelper:
      'Эта дата нужна для проверки срока представления.',
    savePresentationDate: 'Сохранить дату представления',
    runCheck: 'Запустить проверку',
    downloadReport: 'Скачать отчёт',
    dropHint: 'Перетащите файлы сюда или нажмите, чтобы выбрать',
    dropSub: 'Только файлы PDF и текстовые файлы',
    valueLc: 'Аккредитив',
    valueDoc: 'Документ',
    summary: (passed, failed, skipped) =>
      `Проверка завершена — пройдено ${passed} · несоответствий ${failed} · пропущено ${skipped}`,
    summaryPassed: (count) => `пройдено ${count}`,
    summaryFailed: (count) => `несоответствий ${count}`,
    summarySkipped: (count) => `пропущено ${count}`,
    docTypes: {
      LC: 'Аккредитив',
      INVOICE: 'Коммерческий инвойс',
      PACKING_LIST: 'Упаковочный лист',
      BILL_OF_LADING: 'Коносамент',
      INSURANCE: 'Страховой сертификат',
      unknown: 'Тип не определён',
    },
    ruleNames: {
      1: 'Крайняя дата отгрузки',
      2: 'Срок представления (21 день)',
      3: 'Срок действия аккредитива',
      4: 'Дата страхования',
      5: 'Лимит суммы инвойса',
      6: 'Совпадение веса брутто',
      7: 'Совпадение количества',
      8: 'Совпадение числа мест',
      9: 'Соответствие описания товара',
      10: 'Совпадение портов',
      11: 'Совпадение грузополучателя',
      12: 'Совпадение уведомляемой стороны',
      13: 'Наличие требуемых документов',
      14: 'Отметка о погрузке на борт',
      15: 'Индоссамент (не проверяется в этой версии)',
    },
    verdicts: {
      corresponds: 'Похоже на тот же товар',
      discrepancy: 'Действительно различается',
      likely_typo: 'Похоже на опечатку',
      different: 'Похоже на другую компанию',
      unsure: 'Неясно',
    },
    aiNotePrefix: 'Примечание ИИ:',
    comparison: {
      leftHeader: 'Аккредитив / эталонное значение',
      rightHeader: 'Значение в документе',
      lcLatestShipmentDate: 'Крайняя дата отгрузки по аккредитиву',
      blShippedOnBoardDate: 'Дата погрузки на борт в коносаменте',
      lcPresentationDays: 'Срок представления по аккредитиву',
      daysToPresent: 'Дней до представления',
      lcExpiryDate: 'Срок действия аккредитива',
      presentationDate: 'Дата представления',
      shipmentDate: 'Дата отгрузки',
      insuranceIssueDate: 'Дата выдачи страхового документа',
      lcAmount: 'Сумма аккредитива',
      invoiceAmount: 'Сумма инвойса',
      packingGrossWeight: 'Вес брутто в упаковочном листе',
      blGrossWeight: 'Вес брутто в коносаменте',
      invoiceQuantity: 'Количество в инвойсе',
      packingQuantity: 'Количество в упаковочном листе',
      packingCartons: 'Число мест в упаковочном листе',
      blCartons: 'Число мест в коносаменте',
      lcGoodsDescription: 'Описание товара в аккредитиве',
      invoiceGoodsDescription: 'Описание товара в инвойсе',
      lcPorts: 'Порты в аккредитиве',
      blPorts: 'Порты в коносаменте',
      lcApplicant: 'Приказодатель аккредитива',
      blConsignee: 'Грузополучатель в коносаменте',
      blNotifyParty: 'Уведомляемая сторона в коносаменте',
      requiredDocuments: 'Требуемые документы по аккредитиву',
      missingDocuments: 'Отсутствующие документы',
      requiredNotation: 'Требуемая отметка',
      blNotation: 'Отметка в коносаменте',
      loading: 'Погрузка',
      discharge: 'Выгрузка',
      limit: 'лимит',
      daysUnit: ' дн.',
      onBoardPresent: 'Отметка о погрузке на борт есть',
      onBoardAbsent: 'Отметки нет',
    },
    results: {
      failedHeading: (count) => `Несоответствия: ${count}`,
      skippedHeading: (count) => `Пропущено: ${count}`,
      passedHeading: (count) => `Пройдено: ${count}`,
      noFailed: 'Несоответствий нет.',
      noSkipped: 'Пропущенных проверок нет.',
      noPassed: 'Пройденных проверок нет.',
      badgeFailed: 'Несоответствие',
      badgeSkipped: 'Пропущено',
      badgePassed: 'Пройдено',
      showPassed: 'Показать пройденные проверки',
      hidePassed: 'Скрыть пройденные проверки',
      noReason: 'Причина не указана',
      unknownRule: (ruleNo) => `Проверка ${ruleNo}`,
    },
    messages: {
      newSet: 'Новый набор создан.',
      uploaded: 'Файл загружен.',
      dateSaved: 'Дата представления сохранена.',
      reportDownloaded: 'Отчёт загружен.',
    },
    errors: {
      createSet: 'Не удалось создать набор.',
      noSet: 'Сначала создайте новый набор.',
      noFile: 'Выберите файл для загрузки.',
      upload: 'Не удалось загрузить файл.',
      dateRequired: 'Выберите дату представления документов в банк.',
      dateSave:
        'Не удалось сохранить дату представления. Проверьте, что сервер запущен.',
      check: 'Проверка не удалась. Проверьте, что сервер запущен.',
      report: 'Не удалось загрузить отчёт. Сначала выполните проверку.',
    },
  },
}
