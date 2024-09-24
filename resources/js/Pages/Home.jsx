import ConversationHeader from "@/Components/App/ConversationHeader";
import MessageInput from "@/Components/App/MessageInput";
import MessageItem from "@/Components/App/MessageItem";
import { useEventBus } from "@/EventBus";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import ChatLayout from "@/Layouts/ChatLayout";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { useCallback, useRef } from "react";
import { useEffect } from "react";
import { useState } from "react";
import {AttachmentPreviewModal} from "@/Components/App/AttachmentPreviewModal";
function Home({ selectedConversation = null, messages = null }) {
    // console.log("messages", messages);
    const [localMessages, setlocalMessages] = useState([]);
    const messagesCtrRef = useRef(null);
    const loadMoreIntersect = useRef(null);
    const [noMoreMessages, setNoMoreMessages] = useState(false);
    const [ScrollFromBottom, setScrollFromBottom] = useState(0);
    const [showAttachmentPreview, setShowAtteachmentPreview] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState({});
    const { on } = useEventBus();
    const messageCreated = (message) => {
        if (
            selectedConversation &&
            selectedConversation.is_group &&
            selectedConversation.id === message.group_id
        ) {
            setlocalMessages((prevMessages)=> [...prevMessages, message]);
        }
        if (
            selectedConversation &&
            selectedConversation.is_user &&
            (selectedConversation.id == message.sender_id || selectedConversation.id == message.receiver_id)
        ) {
            setlocalMessages((prevMessages)=> [...prevMessages, message]);
        }
    };

    const loadMoreMessages= useCallback(()=>{
        //Find the first message object
        if (noMoreMessages) {
            return;
            
        }
        const firstMessage = localMessages[0];
        axios
            .get(route("message.loadOlder",firstMessage.id))
            .then(({data})=>{
                if (data.data.length === 0) {
                    setNoMoreMessages(true);
                    return;
                }
                //calculatehow much is scrolled from bottom and scroll to the same position from bottom after message loaded
                const scrollHeight = messagesCtrRef.current.scrollHeight;
                const scrollTop = messagesCtrRef.current.scrollTop;
                const clientHeight = messagesCtrRef.current.clientHeight;
                const tmpScrollFromBottom = scrollHeight - scrollTop - clientHeight;
                console.log("tmpScrollFromBottom ", tmpScrollFromBottom);
                setScrollFromBottom(scrollHeight - scrollTop - clientHeight);
                setlocalMessages((prevMessages)=>{
                    return [...data.data.reverse(), ...prevMessages];
                });
            });
    },[localMessages, noMoreMessages]);

    const onAttachmentClick = (attachment, ind) => {
        setPreviewAttachment({attachment,ind,});
        setShowAtteachmentPreview(true);
    }

    useEffect(() => {
        setTimeout(() => {
            if (messagesCtrRef.current) {
                messagesCtrRef.current.scrollTop =
                    messagesCtrRef.current.scrollHeight;
            }
        }, 10);

        const offCreated = on("message.created", messageCreated);
        setScrollFromBottom(0);
        setNoMoreMessages(false);
        return () => {
            offCreated();
        };
    }, [selectedConversation]);

    useEffect(() => {
        // console.log("messages from props:", messages);
        setlocalMessages(messages ? messages.data.reverse() : []);
    }, [messages]);

    useEffect(() => {
        if (messagesCtrRef.current && ScrollFromBottom !==null) {
            messagesCtrRef.current.scrollTop =
            messagesCtrRef.current.scrollHeight -
            messagesCtrRef.current.offsetHeight -
            ScrollFromBottom;
        }

        if(noMoreMessages)
        {
            return;
        }

        const observer = new IntersectionObserver(
            (enteries) => 
                enteries.forEach(
                    (entry) => entry.isIntersecting && loadMoreMessages()
                ),
            {
                rootMargin: "2px 0px 250px 0px",
            }
        );

        if (loadMoreIntersect.current) {
            setTimeout(() => {
                observer.observe(loadMoreIntersect.current);
            }, 100);
        }

        return () =>{
            observer.disconnect();
        };

    }, [localMessages])
    
    return (
        <>
            {!messages && (
                <div className="flex flex-col gap-8 justify-center items-center text-center h-full opacity-35">
                    <div className="text-2xl md:text-4xl p-16 text-slate-200">
                        Please select conversation to see messages.
                    </div>
                    <ChatBubbleLeftRightIcon className="w-32 h-32inline-block" />
                </div>
            )}
            {messages && (
                <>
                    <ConversationHeader
                        selectedConversation={selectedConversation}
                    />
                    <div
                        ref={messagesCtrRef}
                        className="flex-1 overflow-y-auto p-5"
                    >
                        {/*Messages */}

                        {localMessages.length === 0 && (
                            <div className="text-lg text-slate-200">
                                No messages found
                            </div>
                        )}
                        {localMessages.length > 0 && (
                            <div className="flex-1 flex flex-col">
                                <div ref={loadMoreIntersect}></div>
                                {localMessages.map((message) => (
                                    <MessageItem
                                        key={message.id}
                                        message={message}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <MessageInput conversation={selectedConversation} />
                </>
            )}
            {previewAttachment.attachments && (
                <AttachmentPreviewModal
                    attachments={previewAttachment.attachments}
                    index={previewAttachment.ind}
                    show={showAttachmentPreview}
                    onClose={() => setShowAtteachmentPreview(false)}
                />
            )}
   
        </>
    );
}

Home.layout = (page) => {
    return (
        <AuthenticatedLayout user={page.props.auth.user}>
            <ChatLayout children={page} />
        </AuthenticatedLayout>
    );
};
export default Home;
