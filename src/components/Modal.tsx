// src/components/Modal.tsx

/**
 * This component renders a full-screen modal for important game messages,
 * such as "Game Over," "Victory," or temporary wave completion notices.
 */

import React from 'react';
import type { IModalState } from '../game/types';

// Define the props the Modal component expects.
interface IModalProps {
    modalState: IModalState;
    isPermanent: boolean; // Determines if a restart button should be shown
    onRestart: () => void;
}

export const Modal: React.FC<IModalProps> = ({ modalState, isPermanent, onRestart }) => {
    // If the modal isn't supposed to be shown, render nothing.
    if (!modalState.show) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-8 bg-chaos-primary/90">
            {/* The main title of the modal, styled with the provided color */}
            <h2 className={`text-6xl font-black mb-4 ${modalState.color}`}>{modalState.title}</h2>

            {/* The descriptive text of the modal */}
            <p className="text-2xl mb-8">{modalState.text}</p>

            {/* The restart button is only shown for permanent modals (Game Over / Victory) */}
            {isPermanent && (
                <button
                    onClick={onRestart}
                    className="bg-chaos-accent rounded-lg px-8 py-4 text-xl font-black uppercase tracking-widest text-white hover:bg-red-500 transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    );
};
