<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\StoreMessageRequest;
use App\Models\Message;
use App\Models\User;
use App\Events\SocketMessage;
use App\Models\Group;
use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Conversation;
use Illuminate\Support\Str;
use App\Models\MessageAttachment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\MessageAttachmentResource;
class MessageController extends Controller
{
    public function byUser(User $user)
    {
        $messages = Message::where('sender_id', auth()->id())
        ->where('receiver_id', $user->id)
        ->orWhere('sender_id', $user->id)
        ->where('receiver_id', auth()->id())
        ->latest()
        ->paginate(10);
        \Log::info('Fetched Messages:', $messages->toArray());


        return inertia('Home', [
            'selectedConversation' => $user->toConversationsArray(),
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function byGroup(Group $group)
    {
        \Log::info('This is a test log entry.');

        $messages = Message::where('group_id', $group->id)       
        ->latest()
        ->paginate(10);
       
        return inertia('Home', [
            'selectedConversation' => $group->toConversationsArray(),
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function loadOlder(Message $message)
    {
        if ($message->group_id) {
            $messages = Message::where('created_at', '<', $message->created_at)
                        ->where('group_id', $message->group_id)
                        ->latest()
                        ->paginate(10);
        }
        else
        {
            $messages = Message::where('created_at', '<', $message->created_at)
            ->where(function ($query) use ($message){
                $query->where('sender_id', $message->sender_id)
                    ->where('receiver_id',  $message->receiver_id)
                    ->orWhere('sender_id',$message->receiver_id)
                    ->where('receiver_id',  $message->sender_id);

            })
            ->latest()
            ->paginate(10);          
        }

        return MessageResource::collection($messages);
    }

    public function store(StoreMessageRequest $request)
    {
        $data = $request->validated();
        $data['sender_id'] = auth()->id();
        $receiverId = $data['receiver_id'] ?? null;
        $groupId = $data['group_id'] ?? null;

        $files = $data['attachments'] ?? [];

        $message = Message::create($data);

        $attachments = [];
        if ($files) {
            foreach($files as $file)
            {
                $directory = 'attachment/' . Str::random(32);
                Storage::makeDirectory($directory);
                $model = [
                    'message_id' => $message->id,
                    'name' => $file->getClientOriginalName(),
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'path' => $file->store($directory,'public'),
                ];
                    $attachment = MessageAttachment::create($model);
                    $attachments[] = $attachment;
            }
           
            $message->attachments = $attachments;
        }

        if ($receiverId) {
            Conversation::updateConversationWithMessage($receiverId, auth()->id(),$message);
        }

        if ($groupId) {
            Group::updateGroupWithMessage($groupId,$message);
        }

        SocketMessage::dispatch($message);

        return new MessageResource($message);

    }

    public function destroy(Message $Message)
    {
        //check if the user is the owner of the message
        if ($message->sender_id !== auth()->id()) {
            return response()->json(['message' => 'Forbidden'],403);
        }
        
        $message->delete();

        return response('',204);
    }
}
