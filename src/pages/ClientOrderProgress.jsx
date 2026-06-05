import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ClientOrderProgress() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/client/request/${requestId}`, { replace: true });
  }, [requestId, navigate]);

  return null;
}
