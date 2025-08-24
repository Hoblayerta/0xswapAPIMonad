'use client';

import { useEffect, useState } from 'react';
import { useSwitchChain } from 'wagmi';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export default function SwitchChainModal({
  buttonText,
  requiredChainId,
}: {
  buttonText: string;
  requiredChainId: number;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const { chains, switchChain } = useSwitchChain({
    mutation: {
      onSuccess(data) {
        console.log(data);
        toast.success(`Cambiado a la cadena ${data.name}`);
        return null;
      },
    },
  });
  const [selectedChain] = chains.filter(
    (chain) => chain.id === requiredChainId
  );

  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
    }
  }, [isMounted]);

  function handleSwitchChain() {
    switchChain({ chainId: selectedChain.id });
    toast.info(`Acepta el cambio a la cadena ${selectedChain.name}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild className="w-full">
        <Button>{buttonText}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Cambiar Cadena</DialogTitle>
          <DialogDescription>
            {`Esta acción solo está habilitada para ${selectedChain?.name || 'Monad'}. Necesitas cambiar de cadena`}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleSwitchChain}>
          {`Cambiar a ${selectedChain?.name || 'Monad'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}