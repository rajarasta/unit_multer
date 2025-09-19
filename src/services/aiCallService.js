class AICallService {
  constructor() {
    this.aiCallModels = {
      unitCallModel: 'model1',
      multipleUnitsCallModel: 'model1',
      unitCallModelConfig: null,
      multipleUnitsCallModelConfig: null
    };

    this.modelConfigs = {};
    this.loadSettings();
    this.setupEventListeners();
  }

  loadSettings() {
    try {
      const savedGlobals = localStorage.getItem('global-ui-settings');
      const savedModels = localStorage.getItem('multi-model-settings');

      if (savedGlobals) {
        const globalSettings = JSON.parse(savedGlobals);
        this.aiCallModels.unitCallModel = globalSettings.unitCallModel || 'model1';
        this.aiCallModels.multipleUnitsCallModel = globalSettings.multipleUnitsCallModel || 'model1';
      }

      if (savedModels) {
        this.modelConfigs = JSON.parse(savedModels);
        this.updateModelConfigs();
      }
    } catch (e) {
      console.warn('Failed to load AI call settings:', e);
    }
  }

  updateModelConfigs() {
    this.aiCallModels.unitCallModelConfig = this.modelConfigs[this.aiCallModels.unitCallModel];
    this.aiCallModels.multipleUnitsCallModelConfig = this.modelConfigs[this.aiCallModels.multipleUnitsCallModel];
  }

  setupEventListeners() {
    window.addEventListener('ai-call-models-updated', (event) => {
      const { unitCallModel, multipleUnitsCallModel, unitCallModelConfig, multipleUnitsCallModelConfig } = event.detail;
      this.aiCallModels = {
        unitCallModel,
        multipleUnitsCallModel,
        unitCallModelConfig,
        multipleUnitsCallModelConfig
      };
    });

    window.addEventListener('multi-model-settings-updated', (event) => {
      const { modelConfigs } = event.detail;
      this.modelConfigs = modelConfigs;
      this.updateModelConfigs();
    });
  }

  getUnitCallModel() {
    return {
      modelId: this.aiCallModels.unitCallModel,
      config: this.aiCallModels.unitCallModelConfig
    };
  }

  getMultipleUnitsCallModel() {
    return {
      modelId: this.aiCallModels.multipleUnitsCallModel,
      config: this.aiCallModels.multipleUnitsCallModelConfig
    };
  }

  async makeUnitCall(unitData, userPrompt = '') {
    const model = this.getUnitCallModel();
    if (!model.config) {
      throw new Error('Unit call model not configured');
    }

    return this.makeAPICall(model.config, {
      unitData,
      userPrompt,
      callType: 'single-unit'
    });
  }

  async makeMultipleUnitsCall(unitsData, userPrompt = '') {
    const model = this.getMultipleUnitsCallModel();
    if (!model.config) {
      throw new Error('Multiple units call model not configured');
    }

    return this.makeAPICall(model.config, {
      unitsData,
      userPrompt,
      callType: 'multiple-units'
    });
  }

  async makeAPICall(modelConfig, payload) {
    const { baseUrl, apiKey, selectedModel, systemPrompt, temperature, maxTokens } = modelConfig;

    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: this.formatPrompt(payload)
        }
      ],
      temperature,
      max_tokens: maxTokens
    };

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`AI call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'No response';
  }

  formatPrompt(payload) {
    const { callType, userPrompt } = payload;

    if (callType === 'single-unit') {
      const { unitData } = payload;
      return `${userPrompt}\n\nUnit Type: ${unitData.type}\nContent: ${JSON.stringify(unitData.content)}`;
    } else if (callType === 'multiple-units') {
      const { unitsData } = payload;
      const unitsInfo = unitsData.map((unit, index) =>
        `Unit ${index + 1} - Type: ${unit.type}, Content: ${JSON.stringify(unit.content)}`
      ).join('\n');
      return `${userPrompt}\n\nMultiple Units Data:\n${unitsInfo}`;
    }

    return userPrompt;
  }

  triggerUnitCall(unitId) {
    window.dispatchEvent(new CustomEvent('trigger-unit-reasoning', {
      detail: {
        unitId,
        useSelectedModel: true,
        modelConfig: this.getUnitCallModel()
      }
    }));
  }

  triggerMultipleUnitsCall(unitIds) {
    window.dispatchEvent(new CustomEvent('trigger-combined-reasoning', {
      detail: {
        unitIds,
        useSelectedModel: true,
        modelConfig: this.getMultipleUnitsCallModel()
      }
    }));
  }
}

const aiCallService = new AICallService();

export default aiCallService;
export { AICallService };