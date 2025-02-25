# @mastra/voice-google

## 0.1.0-alpha.3

### Patch Changes

- Updated dependencies [6cb63e0]
  - @mastra/core@0.4.2-alpha.1

## 0.1.0-alpha.2

### Patch Changes

- 5e0f727: deprecate @mastra/speech-google for @mastra/voice-google

## 0.1.0

### Minor Changes

- Initial release of @mastra/voice-google
- Combines functionality from deprecated @mastra/speech-google
- Adds Speech-to-Text capabilities
- Implements new MastraVoice interface from @mastra/core

### Notes

This package replaces @mastra/speech-google, which reached version 0.1.3-alpha.1. Key features from the previous package:

- Neural Text-to-Speech synthesis
- Multiple voice options
- Streaming support
- Integration with Google Cloud services

The new package adds:

- Speech-to-Text recognition
- Combined speech and listening models
- Improved voice management
- Better type safety and error handling
