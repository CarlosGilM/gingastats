import { useState } from 'react';

interface Props {
    sofascoreId: number;
    nome: string;
    size?: number;
}

export default function EscudoTime({ sofascoreId, nome, size = 32 }: Props) {
    const [erro, setErro] = useState(false);

    if (erro) {
        return (
            <div
                className="rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold flex-shrink-0"
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {nome.charAt(0)}
            </div>
        );
    }

    return (
        <img
            src={`https://api.sofascore.app/api/v1/team/${sofascoreId}/image`}
            alt={nome}
            width={size}
            height={size}
            className="object-contain flex-shrink-0"
            onError={() => setErro(true)}
        />
    );
}