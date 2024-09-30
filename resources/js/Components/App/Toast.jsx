import { useEventBus } from '@/EventBus'
import React, { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid';

export default function Toast(){
    const [toasts, setToasts] = useState([]);
    const { on } = useEventBus();

    useEffect(() => {
      on('toast.show', (message) => {  // Changed here
            const uuid = uuidv4();

            setToasts((oldToasts) => [...oldToasts, { message, uuid }]);

            setTimeout(() => {
                setToasts((oldToasts) => oldToasts.filter((toast) => toast.uuid !== uuid));
            }, 5000);
      });
    }, [on]);

    return (
        <div className='toast min-w-["240px"]'>
            {toasts.map((toast) => (
                <div key={toast.uuid} className='alert alert-success px-4 py-3 text-gray-100 rounded-md'>
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
