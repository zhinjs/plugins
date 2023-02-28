export type ContentType = 'text'

export type Role = 'user' | 'assistant'

export interface SessionResult {
    user: User
    expires: string
    accessToken: string
}

export interface User {
    id: string
    name: string
    email: string
    image: string
    picture: string
    groups: string[] | []
    features: string[] | []
}

export interface ModelsResult {
    models: Model[]
}

export interface Model {
    slug: string
    max_tokens: number
    is_special: boolean
}

export interface ModerationsJSONBody {
    input: string
    model: AvailableModerationModels
}

export type AvailableModerationModels = 'text-moderation-playground'

export interface ModerationsJSONResult {
    flagged: boolean
    blocked: boolean
    moderation_id: string
}
export interface ConversationJSONBody {
    action: string
    conversation_id?: string
    messages: Prompt[]
    model: string
    parent_message_id: string
}

export interface Prompt {
    content: PromptContent
    id: string
    role: Role
}

export interface PromptContent {
    content_type: ContentType
    parts: string[]
}

export interface MessageFeedbackJSONBody {
    conversation_id: string
    message_id: string
    rating: MessageFeedbackRating
    tags?: MessageFeedbackTags[]
    text?: string
}

export type MessageFeedbackTags = 'harmful' | 'false' | 'not-helpful'

export interface MessageFeedbackResult {
    message_id: string
    conversation_id: string
    user_id: string
    rating: MessageFeedbackRating
    text?: string
}

export type MessageFeedbackRating = 'thumbsUp' | 'thumbsDown'

export interface ConversationResponseEvent {
    message?: Message
    conversation_id?: string
    error?: string | null
}

export interface Message {
    id: string
    content: MessageContent
    role: string
    user: string | null
    create_time: string | null
    update_time: string | null
    end_turn: null
    weight: number
    recipient: string
    metadata: MessageMetadata
}

export interface MessageContent {
    content_type: string
    parts: string[]
}

export type MessageMetadata = any