import React from 'react';
import { PhoneOff } from 'lucide-react';
import styled from 'styled-components';

const LeaveButtonContainer = styled.div`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: white;
  padding: 1rem;
  border-radius: 9999px;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background: var(--color-accent-hover);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

interface Props {
  onLeave: () => void;
}

const LeaveButton: React.FC<Props> = ({ onLeave }) => {
  return (
    <LeaveButtonContainer>
      <Button onClick={onLeave} title="Leave call">
        <PhoneOff size={24} />
      </Button>
    </LeaveButtonContainer>
  );
};

export default LeaveButton; 